# Modelo de dados — App de treinamento de triathlon

Documento de referência para implementação. Toda alteração de schema deve ser feita via migration do Supabase e refletida aqui. Este documento é a fonte da verdade: se o código diverge dele, ou o código está errado ou o documento precisa ser atualizado conscientemente.

## Princípios gerais

**Row Level Security (RLS) em todas as tabelas.** Cada tabela com dados de usuário tem uma coluna `user_id` e uma policy que garante `user_id = auth.uid()`. Nenhum dado de um atleta é visível para outro, garantido no nível do banco — mesmo que o código da aplicação tenha um bug, o vazamento é impossível.

**Colunas para o que se consulta, JSONB para o que se carrega inteiro.** Regra de decisão usada em todo o modelo: se um dado participa de filtros, ordenações ou agregações SQL ("soma de TSS da semana", "treinos de bike do mês"), ele é coluna tipada. Se um dado só é lido em bloco para renderizar uma tela (estrutura de um treino, streams de um gráfico), ele é JSONB. Isso mantém as consultas rápidas sem explodir o número de tabelas.

**Enums via CHECK constraint, não tipos ENUM do Postgres.** Tipos ENUM nativos são difíceis de alterar em migrations (adicionar valor exige comandos especiais). CHECK constraints (`sport IN ('swim','bike','run',...)`) dão a mesma garantia e são triviais de evoluir.

**Timestamps padrão.** Todas as tabelas têm `created_at timestamptz default now()`; tabelas mutáveis têm também `updated_at` (mantido por trigger).

**IDs.** `uuid` com `gen_random_uuid()` em tudo. UUIDs permitem gerar IDs no cliente quando útil e não vazam volume de dados (como IDs sequenciais fazem).

---

## Grupo 1 — Identidade e configuração do atleta

### `profiles`

Extensão da tabela `auth.users` do Supabase (relação 1:1 pelo mesmo `id`). O Supabase gerencia autenticação; esta tabela guarda o que o app precisa saber sobre o atleta.

| Campo | Tipo | Justificativa |
|---|---|---|
| `id` | uuid PK | Mesmo id de `auth.users` — padrão Supabase. |
| `display_name` | text | Nome exibido no app. |
| `birth_date` | date | Idade alimenta estimativas de FC máxima (220−idade) quando não há teste. |
| `sex` | text CHECK | Afeta estimativas fisiológicas padrão. |
| `weight_kg` | numeric | Necessário para potência relativa (W/kg) no ciclismo. |
| `timezone` | text | Define a "virada do dia" do PMC e o horário do sync. Atleta em fuso diferente do servidor teria treinos caindo no dia errado sem isso. |

### `athlete_thresholds`

Histórico de limiares fisiológicos. **Decisão importante: é uma tabela de histórico, não campos no perfil.** Dois motivos: (1) o TSS de um treino deve ser calculado com o limiar vigente *na data do treino* — se o FTP do atleta era 200W em março, o treino de março usa 200W para sempre, mesmo que o FTP suba para 220W em junho; (2) a página Progresso mostra a evolução dos limiares ao longo do tempo, o que exige o histórico.

| Campo | Tipo | Justificativa |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles | |
| `sport` | text CHECK (`swim`,`bike`,`run`) | Cada esporte tem seus limiares. |
| `metric` | text CHECK (`ftp`,`threshold_pace`,`css`,`lthr`,`max_hr`) | `ftp` em watts (bike); `threshold_pace` em s/km (corrida); `css` em s/100m (natação, Critical Swim Speed); `lthr` FC de limiar; `max_hr` FC máxima. |
| `value` | numeric | Unidade definida pela métrica (documentada acima). |
| `effective_from` | date | Data a partir da qual o valor vale. O cálculo de TSS busca o registro mais recente com `effective_from <= data do treino`. |
| `source` | text CHECK (`manual`,`test`,`data_estimate`,`ai_estimate`) | Rastreia a confiabilidade, em ordem decrescente: `test` (teste formal) > `data_estimate` (derivado dos melhores esforços do histórico importado) > `manual` (autorrelato) > `ai_estimate` (estimativa por formulário). |

Constraint: `UNIQUE (user_id, sport, metric, effective_from)`.

### `garmin_connections`

Credenciais de sessão da integração não-oficial com o Garmin Connect. **Regra inviolável: a senha do Garmin nunca é armazenada** — o login acontece uma vez, os tokens de sessão resultantes são guardados criptografados, a senha é descartada.

| Campo | Tipo | Justificativa |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK, UNIQUE | Uma conexão por usuário. |
| `oauth_tokens` | text | Tokens de sessão criptografados (ver seção "Criptografia" ao final). |
| `token_expires_at` | timestamptz | Permite avisar o usuário antes da expiração em vez de falhar silenciosamente. |
| `status` | text CHECK (`active`,`expired`,`error`,`disconnected`) | O feed e o perfil mostram o estado da conexão; sync só roda em `active`. |
| `last_sync_at` | timestamptz | Ponto de partida do próximo sync incremental (buscar só o que é novo). |
| `last_error` | text | Diagnóstico quando o sync falha — essencial numa integração não-oficial que pode quebrar. |

---

## Grupo 2 — O plano (hierarquia da periodização)

### `plans`

O macrociclo: uma temporada apontada para uma prova alvo.

| Campo | Tipo | Justificativa |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `title` | text | Ex.: "Rumo ao 70.3 Floripa 2027". |
| `goal_type` | text CHECK (`race`,`fitness`) | `race`: temporada apontada para uma prova. `fitness`: plano contínuo sem prova — mesociclos rolantes, sem taper, alvo de CTL/consistência. Conversível: assinar uma prova transforma o plano. |
| `race_name` | text NULL | Nome da prova alvo. NULL quando `goal_type='fitness'`. |
| `race_date` | date NULL | Âncora do plano quando `goal_type='race'` (fases calculadas de trás para frente). NULL em planos contínuos. |
| `race_type` | text CHECK NULL (`sprint`,`olympic`,`half`,`full`,`other`) | Define volumes e durações típicas que o gerador usa. NULL em planos contínuos. |
| `status` | text CHECK (`draft`,`generating`,`active`,`completed`,`abandoned`) | Índice parcial único garante **no máximo 1 plano `active` por usuário** — simplifica todo o resto do app (feed, calendário e página Plano sempre sabem qual plano mostrar). |
| `strategy_text` | text | A narrativa da estratégia gerada pela IA na criação. Gerada uma vez, exibida na página Plano. É o "contrato" entre atleta e plano. |
| `form_snapshot` | jsonb | Respostas completas do formulário de onboarding. Justificativa: auditoria (saber com base em quê o plano foi gerado) e regeneração (se o usuário quiser recriar o plano, não precisa preencher tudo de novo). JSONB porque o formulário vai evoluir e esses dados nunca são consultados por SQL. |
| `weekly_hours_available` | numeric | Restrição mais importante do gerador; coluna própria (fora do snapshot) porque o revisor semanal a consulta diretamente. |
| `week_skeletons` | jsonb | Esqueleto de todas as semanas (TSS/horas alvo, ênfase, recuperação) produzido pelo gerador. É o mapa que o revisor consulta para materializar cada semana — ver `/docs/contratos-ia.md` (geração rolante). |

### `plan_phases`

Os mesociclos (etapas). Cada etapa tem objetivo em texto **e alvos mensuráveis em campos estruturados** — é isso que permite à página Plano mostrar "no alvo / atenção / fora do alvo" com base em comparação objetiva, sem chamar IA.

| Campo | Tipo | Justificativa |
|---|---|---|
| `id` | uuid PK | |
| `plan_id` | uuid FK → plans | |
| `user_id` | uuid FK | Denormalizado para simplificar RLS (evita policy com JOIN, que é mais lenta e mais fácil de errar). Padrão repetido em todas as tabelas filhas. |
| `position` | int | Ordem das etapas na linha do tempo. |
| `type` | text CHECK (`base`,`build`,`peak`,`taper`,`race_week`,`recovery`) | Vocabulário clássico da periodização; a IA gera dentro desse vocabulário fechado. |
| `start_date`, `end_date` | date | Sem sobreposição entre fases do mesmo plano (validado na aplicação). |
| `objective_text` | text | O objetivo em linguagem humana, exibido na página Plano. |
| `target_ctl` | numeric NULL | Alvo de fitness ao fim da etapa. NULL quando não se aplica (ex.: taper não busca subir CTL). |
| `min_adherence_pct` | numeric NULL | Aderência mínima esperada (ex.: 80). |
| `key_workouts_target` | int NULL | Quantos treinos-chave a etapa espera completados. |
| `status` | text CHECK (`upcoming`,`current`,`completed`) | Atualizado por job diário conforme as datas. |

### `planned_workouts`

Os treinos diários gerados pelo plano — a materialização dos microciclos.

| Campo | Tipo | Justificativa |
|---|---|---|
| `id` | uuid PK | |
| `plan_id`, `phase_id`, `user_id` | uuid FK | Treino sabe a que fase pertence — a página Plano calcula aderência por fase com um GROUP BY simples. |
| `scheduled_date` | date | |
| `sport` | text CHECK (`swim`,`bike`,`run`,`brick`,`strength`,`rest`) | `rest` é um treino explícito: descanso planejado é diferente de dia vazio, e o calendário mostra isso. |
| `title` | text | Ex.: "Bike — 4x8min em Z4". |
| `description` | text | Instruções em linguagem humana. |
| `structure` | jsonb | Estrutura de passos do treino (aquecimento, séries, intervalos, alvos por zona). JSONB porque a estrutura varia radicalmente entre um intervalado de bike e um treino de técnica de natação, e ela nunca é consultada por SQL — só renderizada e comparada com o realizado. Schema do JSON validado por Zod na aplicação. |
| `planned_duration_min` | int | Coluna (não JSONB) porque "volume planejado da semana" é consulta frequente. |
| `planned_tss` | numeric | Permite projetar o PMC futuro ("se eu cumprir o plano, minha forma na prova será X") — feature clássica do TrainingPeaks. |
| `is_key_workout` | bool | Treinos-chave têm peso maior na avaliação da etapa; o calendário os destaca. |
| `status` | text CHECK (`planned`,`completed`,`partial`,`skipped`) | Atualizado pelo matching (abaixo) ou manualmente. |
| `matched_activity_id` | uuid FK NULL → activities | O ponto de encontro entre plano e realidade. Ver "Matching" ao final. |

---

## Grupo 3 — Dados realizados

### `activities`

Um treino realizado, de qualquer fonte. Guarda as **métricas agregadas** em colunas — é a tabela que alimenta feed, calendário e PMC, então precisa ser leve e rápida de consultar.

| Campo | Tipo | Justificativa |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `source` | text CHECK (`garmin`,`file`,`manual`) | Preparado para múltiplas origens desde o dia 1 (Strava entra depois como novo valor, sem migration estrutural). |
| `external_id` | text | ID da atividade na origem. `UNIQUE (user_id, source, external_id)` — **deduplicação garantida pelo banco**: rodar o sync duas vezes jamais duplica um treino. |
| `sport` | text CHECK | Mesmo vocabulário de `planned_workouts`. |
| `start_time` | timestamptz | |
| `duration_s`, `moving_time_s` | int | Tempo total vs. tempo em movimento (pausas importam na análise). |
| `distance_m`, `elevation_gain_m` | numeric | |
| `avg_hr`, `max_hr`, `avg_power`, `normalized_power`, `avg_cadence`, `avg_speed_mps` | numeric NULL | NULL quando o sensor não existe (natação sem potência, etc.). Colunas porque aparecem em cards do feed e comparativos — consultas diretas. |
| `tss` | numeric | A métrica central do sistema — alimenta o PMC. Calculada no processamento do arquivo, com o limiar vigente na data. |
| `intensity_factor` | numeric | IF = intensidade relativa ao limiar; aparece no detalhe e nos insights. |
| `threshold_snapshot` | jsonb | **Congela os limiares usados no cálculo** (ex.: `{"ftp": 200}`). Sem isso, um TSS recalculado com FTP futuro reescreveria a história do PMC. Com isso, o TSS é imutável e auditável. |
| `hr_zones`, `power_zones` | jsonb | Tempo em cada zona (array de segundos). JSONB: lido em bloco pelo gráfico de distribuição, nunca filtrado por SQL. |
| `laps` | jsonb | Voltas/parciais com métricas por lap. Mesma lógica. |
| `route_polyline` | text NULL | Traçado GPS simplificado (~100 pontos, encoded polyline) para o thumbnail do card do Feed. Coluna própria (não nas streams) porque o Feed a consulta em todo card — buscar streams completas para desenhar um thumbnail anularia a separação de tabelas. NULL para atividades indoor. |
| `extra_metrics` | jsonb | Catch-all para métricas de resumo que variam por dispositivo/esporte e não têm coluna própria: SWOLF, braçadas, balanço E/D, trabalho (kJ), oscilação vertical, Training Effect, temperatura, etc. O parser grava tudo que encontrar; a tela de detalhe exibe o que existir. Evita migration a cada métrica nova de firmware. Chaves documentadas em `/docs` conforme o parser evolui. |
| `fit_file_path` | text | Caminho do arquivo bruto no Supabase Storage. O arquivo original nunca é descartado — é o backup fiel que permite reprocessar tudo se um bug de parser for descoberto. |

### `activity_streams`

As séries temporais reamostradas, **separadas de `activities` de propósito**. Justificativa: streams pesam dezenas/centenas de KB por treino. Se morassem na tabela `activities`, toda consulta do feed ("últimos 20 treinos") carregaria megabytes inúteis. Separadas, o detalhe do treino as busca só quando aberto.

| Campo | Tipo | Justificativa |
|---|---|---|
| `activity_id` | uuid PK/FK → activities | Relação 1:1. |
| `resolution_s` | int | Resolução da reamostragem (padrão: 5s). Registrada para os gráficos interpretarem o eixo do tempo. |
| `data` | jsonb | `{"t":[...],"hr":[...],"watts":[...],"pace":[...],"cad":[...],"alt":[...],"dist":[...],"lat":[...],"lng":[...]}` — arrays paralelos; canais ausentes são omitidos. Formato compacto e direto para bibliotecas de gráfico; lat/lng alimentam o mapa interativo do detalhe. |

Regra de retenção do free tier: streams alimentam gráficos; o dado fiel é o arquivo FIT no Storage. Se o banco apertar, streams antigas podem ser descartadas e regeradas sob demanda.

### `activity_insights`

O insight gerado pela IA para cada treino. **Tabela separada (não coluna em `activities`)** por três motivos: permite regenerar o insight guardando as versões anteriores; carrega metadados próprios (modelo, versão do prompt) que não pertencem à atividade; e a atividade existe imediatamente após o sync, enquanto o insight chega segundos depois — ciclos de vida diferentes.

| Campo | Tipo | Justificativa |
|---|---|---|
| `id` | uuid PK | |
| `activity_id` | uuid FK, `user_id` uuid FK | |
| `headline` | text | Uma frase — é o que o card do feed exibe como chamada. |
| `insight_text` | text | A análise completa exibida no detalhe. |
| `model`, `prompt_version` | text | Quando um prompt novo melhorar (ou piorar) os insights, dá para comparar por versão. |

O feed usa o insight mais recente por atividade.

### `daily_metrics`

O PMC pré-computado: uma linha por usuário por dia.

| Campo | Tipo | Justificativa |
|---|---|---|
| `user_id`, `date` | PK composta | |
| `tss_total` | numeric | Soma do TSS do dia (pode haver 2-3 treinos/dia em triathlon). |
| `ctl`, `atl`, `tsb` | numeric | Fitness, fadiga e forma do dia. |

**Por que pré-computar em vez de calcular na hora:** CTL e ATL são médias móveis exponenciais — o valor de hoje depende do de ontem, recursivamente (`CTL_hoje = CTL_ontem + (TSS_hoje − CTL_ontem)/42`; ATL igual com constante 7). Calcular "na hora" exigiria reprocessar meses de histórico a cada abertura do gráfico. Pré-computado, o gráfico da página Progresso é um SELECT simples. **Regra de recálculo em cascata:** quando uma atividade passada é inserida, editada ou excluída, todos os `daily_metrics` daquele usuário a partir daquela data são recalculados (a recursão invalida tudo dali em diante). É barato — um ano são 365 linhas.

---

## Grupo 4 — Ajustes e auditoria

### `plan_adjustments`

Cada mudança que o organismo do plano sofre, com nível, gatilho e justificativa. É a tabela que materializa a regra "ajustes acontecem em semanas e etapas, nunca no dia a dia" — não existe nível `day`.

| Campo | Tipo | Justificativa |
|---|---|---|
| `id` | uuid PK | |
| `plan_id`, `user_id` | uuid FK | |
| `level` | text CHECK (`week`,`phase`) | A restrição de cadência garantida pelo schema. |
| `trigger` | text CHECK (`scheduled_review`,`low_adherence`,`high_fatigue`,`illness`,`user_request`,`phase_end`) | O porquê do ajuste — vira o histórico exibido na página Plano. |
| `proposal` | jsonb | O diff estruturado proposto pela IA (treinos alterados, fases redimensionadas). JSONB validado por Zod; só é aplicado ao banco após aprovação. |
| `rationale_text` | text | A explicação em linguagem humana que o usuário lê ao aprovar/rejeitar. |
| `status` | text CHECK (`proposed`,`approved`,`rejected`,`superseded`) | O fluxo de aprovação do usuário. `superseded` cobre proposta antiga substituída por revisão mais nova antes de decisão. |
| `decided_at` | timestamptz NULL | |

**Fluxo:** a IA nunca escreve diretamente em `planned_workouts`/`plan_phases`. Ela escreve uma proposta aqui; a aprovação do usuário dispara a aplicação do diff pela aplicação (transação). Plano nunca muda sem consentimento e sem registro.

### `ai_logs`

Registro de toda chamada de IA feita pelo sistema.

| Campo | Tipo | Justificativa |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `module` | text CHECK (`plan_generator`,`plan_reviewer`,`insight`) | Os três especialistas. |
| `ref_id` | uuid NULL | Aponta para o plano, ajuste ou atividade relacionada. |
| `prompt_version` | text | |
| `input_tokens`, `output_tokens` | int | Controle de custo real por módulo — com API paga, saber onde o dinheiro vai é requisito, não luxo. |
| `success` | bool, `error` text | Quando um insight não aparece, aqui está o porquê. |

---

## Decisões transversais

**Matching planejado ↔ realizado.** Após cada sync, para cada atividade nova: buscar `planned_workouts` do mesmo usuário com mesmo `sport`, `scheduled_date` = dia da atividade e `status = 'planned'`. Um candidato → vincula automaticamente e marca `completed` (ou `partial` se a duração realizada < 70% da planejada). Zero ou múltiplos candidatos → deixa sem vínculo e a UI oferece vinculação manual no detalhe do treino. Regra deliberadamente simples: erros de matching são visíveis e corrigíveis pelo usuário, e a heurística pode evoluir depois sem mudar o schema.

**Criptografia dos tokens Garmin.** Tokens em `garmin_connections.oauth_tokens` são criptografados na aplicação (AES-256-GCM) com chave guardada como variável de ambiente na Vercel — nunca no banco, nunca no repositório. Um dump do banco sozinho não expõe nenhuma sessão Garmin.

**Índices mínimos iniciais.** `activities (user_id, start_time DESC)` para o feed; `planned_workouts (user_id, scheduled_date)` para o calendário; `daily_metrics` já é servida pela PK composta. Índices adicionais só quando uma consulta lenta real aparecer — índice prematuro é custo de escrita sem benefício medido.

**O que fica explicitamente fora da v1** (decisões adiadas com consciência): multi-planos simultâneos (ex.: plano de força paralelo), compartilhamento treinador-atleta, e `brick` como atividade composta — na v1, um brick realizado chega do Garmin como duas atividades (bike + run) e ambas podem ser vinculadas manualmente ao mesmo treino planejado se necessário.

## Decisões de cálculo (definidas)

1. **TSS de treinos de força:** se a atividade tem dados de FC, calcular **hrTSS** (baseado no tempo em zonas de FC relativo ao LTHR). Sem FC, aplicar valor fixo de **40 TSS por hora**, proporcional à duração. A prioridade hrTSS > valor fixo vale como regra geral para qualquer atividade sem métrica de potência/pace confiável.
2. **Natação sem CSS definido no onboarding:** a IA estima o CSS a partir das respostas do formulário, gravando em `athlete_thresholds` com `source = 'ai_estimate'`. A UI exibe um aviso persistente sugerindo o teste de 400m + 200m nas primeiras semanas; quando o teste é registrado, o novo CSS entra com `source = 'test'` e passa a valer dali em diante (o histórico anterior permanece calculado com a estimativa — regra do `threshold_snapshot`).
