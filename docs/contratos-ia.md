# Contratos de IA — v1

Especificação dos três módulos de IA do produto: `plan-generator`, `plan-reviewer` e `insight-generator`. Cada contrato define gatilho, modelo, contexto de entrada, schema de saída e regras de validação. Os prompts em si vivem em `/lib/ai/prompts/` como arquivos versionados; este documento define o **contrato** que qualquer versão de prompt deve cumprir.

## Princípios transversais

**Validação obrigatória.** Toda saída de IA é JSON validado por schema Zod (`/lib/ai/schemas.ts`) antes de qualquer efeito. Falha de validação → 1 retry com o erro anexado ao prompt ("sua resposta anterior falhou na validação: <erros>") → segunda falha → operação falha registrada em `ai_logs`, UI mostra estado de erro com retry manual. **Nunca aplicar saída parcialmente válida.**

**Logging integral.** Toda chamada gera linha em `ai_logs` (módulo, ref, versão do prompt, tokens, sucesso/erro). Sem exceção — é o painel de custo e qualidade.

**Versionamento de prompt.** Cada arquivo de prompt declara `PROMPT_VERSION` (ex.: `insight-v3`), gravado em `ai_logs` e `activity_insights`. Mudou o prompt → nova versão. É o que permite responder "os insights pioraram depois de qual mudança?".

**Idioma e voz.** Toda saída em pt-BR. A voz é a de um **treinador experiente e direto**: encorajador sem ser bajulador, técnico sem ser hermético, honesto sobre problemas sem ser alarmista. Nunca usa jargão sem tradução. (A calibragem fina da voz é decisão de design — exemplos de tom no arquivo de prompt.)

**Limite de segurança (regra inviolável).** Os módulos **nunca produzem diagnóstico ou conselho médico**. Sinais preocupantes (dor relatada, FC anômala persistente, fadiga extrema) → a saída recomenda descanso e avaliação profissional, e o revisor propõe reduzir carga. Suplementação, medicação e lesões específicas estão fora do escopo de qualquer resposta.

**Modelos.** `insight-generator`: claude-haiku (volume alto, tarefa curta). `plan-generator` e `plan-reviewer`: claude-sonnet (raciocínio estrutural, baixa frequência). Custo estimado para 20 usuários ativos: ~500 insights/mês + ~90 revisões/mês + geração eventual ≈ poucos dólares/mês.

---

## Onboarding do plano (entrada do gerador)

**Ordem do fluxo: conectar Garmin → importar histórico → formulário reduzido e pré-preenchido.** O onboarding é orientado a dados: antes do formulário, o app importa ~90 dias de histórico e deriva o que o autorrelato distorce — horas semanais reais, distribuição entre modalidades, estimativas de limiar pelos melhores esforços (ex.: melhor potência de 20min × 0,95 → FTP; melhores paces → limiar de corrida), e o **CTL de partida real** (o gerador conhece a fitness atual, não a adivinha). Princípio: **dado como default, usuário confirma** — dado passado não é intenção futura (disponibilidade continua sendo pergunta) e o histórico pode ser incompleto. Limiares derivados entram com `source='data_estimate'`. Sem conexão/histórico, o formulário completo é o fallback.

**Fórmulas de estimativa de limiar (decisão tomada no chat de planejamento, 2.9)** — mesmo princípio (melhor esforço sustentado), janela por métrica, calculado sobre o histórico de 90 dias importado; esporte/métrica sem atividade que cubra a janela fica sem estimativa (nunca força um chute):

| Métrica | Esporte | Janela | Cálculo |
|---|---|---|---|
| `ftp` | bike | melhor 20min de potência | × 0,95 |
| `threshold_pace` | corrida | melhor 20min de velocidade | pace direto, sem desconto |
| `css` | natação | melhor 15min de velocidade | pace direto (janela menor: treinos de piscina são mais curtos) |
| `lthr` | swim/bike/run (uma estimativa por esporte) | melhor 20min de FC | valor direto |

`effective_from` do limiar estimado é a data da atividade mais antiga importada — assim, quando cada atividade do lote é processada, o limiar já existe para toda a janela e o TSS nasce correto, sem precisar de recálculo retroativo (rule 6 do CLAUDE.md).

Salvo integralmente em `plans.form_snapshot`; campos estruturais também em colunas próprias. Multi-step com progresso visível. *(Layout e microcopy: domínio do designer; abaixo, o conteúdo funcional.)*

### Passo 1 — Objetivo
| Campo | Tipo | Por que o gerador precisa |
|---|---|---|
| Tipo de objetivo | select (**tenho uma prova alvo** / **quero treinar e evoluir**) | Define `goal_type`. `race`: periodização de trás para frente a partir da prova. `fitness`: mesociclos rolantes de 8–12 semanas (base/build + recuperação), sem taper, alvo de CTL/consistência renovado a cada bloco. Conversível a qualquer momento (inscreveu-se numa prova → o plano se transforma, com todo o histórico). |
| Nome da prova | texto (se `race`) | Personalização da narrativa. |
| Data | date (se `race`) | Âncora da periodização. Mínimo: 8 semanas no futuro; abaixo disso, avisar que o plano será de preparação curta. |
| Distância | select (sprint / olímpico / 70.3 / 140.6 / outra) (se `race`) | Define volumes-alvo e duração típica das fases. |
| Perfil do percurso (opcional, se `race`) | select (plano / ondulado / montanhoso) + mar/águas abertas vs. piscina | Direciona a especificidade da fase Peak. |

### Passo 2 — Histórico e condição atual ("confirme o que encontramos")

Com histórico importado, este passo apresenta os valores derivados dos dados como default editável ("Nos últimos 90 dias você treinou em média 5h40/semana, com predominância de corrida — confere?"). Sem histórico, vira perguntas diretas:
| Campo | Tipo | Por que |
|---|---|---|
| Experiência em triathlon | select (primeira prova / 1–3 provas / veterano) | Calibra progressão de carga e quantidade de instrução nos treinos. |
| Treinando atualmente? | select (parado / irregular / 3–5h semanais / 6–9h / 10h+) | Define o ponto de partida de carga — a decisão mais sensível do gerador; começar alto demais é o erro clássico que gera lesão e abandono. |
| Esporte de origem / mais forte | select (natação / bike / corrida / equilibrado) | Distribui o volume entre modalidades. |
| Modalidade limitadora | select idem | O plano dedica atenção extra a ela (frequência > volume). |
| Melhor resultado recente (opcional) | texto livre por modalidade (ex.: "10k em 52min") | Alimenta estimativas de limiar quando não há teste. |
| Lesões ou restrições físicas atuais | texto livre + flag | Restrições viram regras do plano (ex.: joelho → volume de corrida progride mais devagar). Flag ativa lembrete de avaliação profissional. |

### Passo 3 — Disponibilidade
| Campo | Tipo | Por que |
|---|---|---|
| Horas semanais disponíveis | slider (3–20h) | A restrição mestra (→ `plans.weekly_hours_available`). |
| Dias disponíveis por modalidade | grade semana × modalidade (inclui "qualquer coisa") | O gerador agenda nos dias reais do atleta — aderência nasce aqui. Piscina costuma ter dias fixos. |
| Dia preferido para treino longo | select (sáb / dom / outro) | Estrutura clássica do fim de semana. |
| Acesso a equipamentos | checkboxes (piscina, rolo, medidor de potência, monitor FC, **academia / pesos em casa / só peso corporal**) | Sem medidor de potência → bike por FC/percepção; sem piscina → blocos adaptados; o acesso a força define o que o fortalecimento prescreve. |

### Passo 4 — Limiares conhecidos (opcional, com estimativa como fallback)
FTP (watts), pace limiar de corrida (min/km), CSS (min/100m), FC máxima e LTHR — cada um com "não sei". Preenchidos → `athlete_thresholds` com `source='manual'`. Vazios → o gerador estima a partir dos passos 2–3 (`source='ai_estimate'`) e a UI programa os testes correspondentes nas primeiras 2 semanas do plano.

---

## Contrato 1 — `plan-generator`

**Gatilho:** submissão do formulário de onboarding. **Modelo:** claude-sonnet. **Frequência:** rara (criação/recriação de plano).

### Decisão estrutural: geração rolante, não big-bang

O gerador **não** produz todos os treinos diários da temporada de uma vez. Justificativa tripla: (1) uma temporada de 24 semanas ≈ 150+ treinos detalhados numa única resposta — token demais, qualidade caindo ao longo da geração e validação frágil; (2) treinos da semana 18 gerados hoje seriam fictícios — serão recalibrados pela realidade muitas vezes até lá; (3) o organismo do plano já prevê materialização contínua. Portanto:

- O gerador produz: **estratégia + todas as fases + esqueleto de todas as semanas + treinos detalhados das 2 primeiras semanas**.
- As semanas seguintes são materializadas pelo `plan-reviewer` na revisão semanal (semana N revisada → semana N+1 detalhada a partir do esqueleto).

### Entrada (contexto montado pela aplicação)
- `form_snapshot` completo
- `athlete_thresholds` vigentes (se houver)
- Data atual e data da prova (número de semanas disponíveis)
- Regras fixas do sistema (injetadas no prompt): vocabulário de fases, formato de `structure`, princípios de progressão (rampa de CTL segura, semana de recuperação a cada 3–4, taper de 1–3 semanas conforme distância — inexistente em `goal_type='fitness'`)
- **Fortalecimento é estrutural, não opcional:** 2 sessões/semana em base/build, 1 de manutenção em peak/taper, com progressão própria (adaptação anatômica → força → manutenção) e posicionamento que nunca antecede treino-chave de qualidade. Prescrição limitada ao acesso declarado (academia / casa / peso corporal).
- **Base de conhecimento por modalidade** (`/lib/ai/knowledge/`): **princípios, metodologias e regras — não treinos prontos.** Conteúdo: distribuição de intensidade por fase (ex.: base = predominância Z2; build = 2 sessões de qualidade/semana, nunca consecutivas), teorias de progressão (endurance e força: adaptação anatômica → força → manutenção), regras de interação entre modalidades e de recuperação. Complemento: **2–3 treinos exemplares por modalidade como few-shot** no prompt — calibram formato e qualidade da escrita, não limitam o repertório. O modelo **cria** os treinos livremente dentro desses princípios; a personalização não é limitada por catálogo. Um único cérebro orquestra a semana (as interações entre modalidades são a essência do planejamento de triathlon e exigem contexto único). A base é dado versionado, auditável e evoluível sem tocar em prompt.
- **Como a criação é livre, a validação determinística é reforçada** (rede de segurança na saída, não na entrada) — ver validações abaixo.

### Saída (schema Zod `PlanGenerationSchema`)
```
{
  strategy_text: string (400–900 chars, pt-BR),
  estimated_thresholds?: [{ sport, metric, value, rationale }],   // só p/ campos "não sei"
  phases: [{
    position, type: 'base'|'build'|'peak'|'taper'|'race_week',
    start_date, end_date,             // contíguas, sem sobreposição, terminando na prova
    objective_text,
    target_ctl?, min_adherence_pct?, key_workouts_target?
  }],
  week_skeletons: [{
    week_start_date,
    target_tss, target_hours,
    emphasis: string,                  // ex.: "volume de bike + técnica de natação"
    is_recovery_week: boolean
  }],
  first_weeks_workouts: [{             // 2 semanas
    scheduled_date, sport, title, description,
    structure: WorkoutStructure,       // schema próprio: passos com duração/repetições/alvo por zona
    planned_duration_min, planned_tss, is_key_workout
  }]
}
```
`week_skeletons` é persistido em `plans` como jsonb (adição ao modelo de dados: campo `plans.week_skeletons`) — é o mapa que o revisor consulta para materializar cada semana.

### Validações além do schema (na aplicação)
Aplicadas a **todo treino gerado** (pelo gerador e pelo revisor). Violação → retry com instrução corretiva apontando a regra violada.
- Fases cobrem exatamente o intervalo do plano; semanas de treino ≤ `weekly_hours_available` (+10% tolerância)
- Treinos caem apenas nos dias disponíveis da modalidade
- Rampa de TSS semanal ≤ 10% de crescimento médio (proteção anti-lesão)
- **Coerência interna do treino:** soma das durações das etapas = duração total; TSS estimado a partir da estrutura (duração × intensidade das etapas) bate com `planned_tss` dentro de ±15%; zonas apenas do vocabulário definido
- **Coerência da semana:** dois treinos de qualidade (`is_key_workout` ou intensidade ≥ Z4 predominante) nunca em dias consecutivos; força nunca na véspera de treino-chave

---

## Contrato 2 — `plan-reviewer`

**Gatilhos:** cron semanal (domingo à noite, `scheduled_review`); fim de fase (`phase_end`); pedido do usuário com contexto livre (`user_request`); alertas automáticos (`high_fatigue`: TSB < −30 por 3+ dias; `low_adherence`: < 50% na semana). **Modelo:** claude-sonnet.

### Entrada
- Estrutura do plano (fases + esqueletos + alvos da fase atual)
- Semana encerrada: planejado vs. realizado por treino (incl. motivos de `skipped`), TSS/horas
- `daily_metrics` dos últimos 28 dias (CTL/ATL/TSB)
- Status objetivo da etapa (calculado pela aplicação — a IA explica e reage ao status, não o inventa)
- Contexto livre do usuário (quando `user_request`)
- Histórico de ajustes recentes (evita propor de novo o que foi rejeitado)

### Saída (schema `PlanReviewSchema`)
```
{
  assessment_text: string,                       // leitura da semana, voz de treinador
  adjustment_needed: boolean,
  adjustment?: {
    level: 'week' | 'phase',
    rationale_text: string,
    proposal: {
      workout_changes?: [{ action: 'add'|'remove'|'modify'|'move', workout_ref, change }],
      phase_changes?:   [{ phase_ref, field, from, to }],
      human_summary: string[]                    // o diff legível exibido na aprovação
    }
  },
  next_week_workouts: [{ ...mesmo formato de first_weeks_workouts }]
}
```

### Regras de comportamento
- `adjustment_needed: false` é uma saída legítima e esperada — semana normal gera apenas `assessment_text` + materialização da próxima semana. **Não inventar ajuste para parecer útil.**
- Ajustes `phase` só com gatilho `phase_end`, `user_request` grave ou status "fora do alvo" — nunca por uma semana ruim isolada.
- `next_week_workouts` respeita o esqueleto da semana; desvio do esqueleto > 20% de TSS exige `adjustment` explícito justificando.
- A proposta vai para `plan_adjustments` como `proposed`; a materialização da próxima semana, por ser prevista no esqueleto aprovado, é aplicada diretamente (não é "ajuste" — é execução do plano).

---

## Contrato 3 — `insight-generator`

**Gatilho:** pipeline pós-sync, uma vez por atividade nova (após cálculo de métricas e matching). **Modelo:** claude-haiku.

### Entrada
- Resumo da atividade (colunas + `extra_metrics` + tempo em zonas + laps)
- Treino planejado vinculado (se houver): estrutura e alvos
- Contexto curto: fase atual e objetivo, TSB do dia, TSS dos últimos 7 dias, próximo treino-chave
- Limiar vigente usado no cálculo (para comentar intensidade relativa)

### Saída (schema `InsightSchema`)
```
{
  headline: string (≤ 90 chars),      // a frase do card do Feed
  insight_text: string (300–700 chars, 3–5 frases)
}
```

### Regras de conteúdo
- Estrutura implícita do texto: o que aconteceu → o que significa no contexto (fase/fadiga/plano) → e agora (recuperação, próximo treino).
- Sempre que houver treino planejado vinculado: comentar execução vs. prescrito (o dado mais valioso que temos).
- Números citados com parcimônia (2–3 por insight) e sempre interpretados, nunca despejados.
- Treino ruim → honestidade com contexto ("abaixo do alvo, coerente com a fadiga acumulada"), nunca punição nem falso elogio.
- Proibido: conselho médico, promessas de resultado, comparação com outros atletas.

---

## Adições ao modelo de dados decorrentes deste documento
1. `plans.week_skeletons` (jsonb) — esqueleto semanal produzido pelo gerador, consumido pelo revisor.
2. `plans.status` ganha valor `generating` (entre submissão do formulário e conclusão da geração).
