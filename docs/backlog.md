# Backlog faseado — v1

Sequência de tarefas para o desenvolvimento via Claude Code. Cada tarefa foi dimensionada para caber em uma sessão, tem dependências explícitas e um critério de aceite verificável. Regras de uso:

- **Uma tarefa por branch/PR.** A tarefa só está pronta quando o critério de aceite passa e `npm run test && npm run lint` está verde.
- **Ordem importa dentro da fase**; entre tarefas sem dependência declarada, a ordem é livre.
- Decisão não coberta pelos docs → **parar e perguntar** (regra do CLAUDE.md).
- Ao fim de cada fase há um **checkpoint de uso real**: usar o app de verdade antes de seguir — bugs de fundação custam caro depois.

---

## Fase 0 — Setup (o esqueleto que roda)

**Objetivo:** projeto deployado, com CI mínima, antes de qualquer feature.

**0.1 — Repositório e projeto Next.js**
Clonar o repo do projeto (`https://github.com/to-affonso/the-coach.git`); inicializar com o comando canônico do design system (CLAUDE.md > UI): preset shadcn, base Radix, template Next + TypeScript. Copiar `CLAUDE.md` para a raiz e os docs para `/docs`. Instalar a skill `shadcn/skills`.
*Aceite:* `npm run dev` sobe; página inicial renderiza com tokens do tema (light e dark).

**0.2 — Supabase e variáveis de ambiente**
Criar projeto Supabase; configurar clientes (browser + server) em `/lib/db`; `.env.local` + `.env.example` documentado; nada sensível commitado.
*Aceite:* healthcheck de conexão com o banco passa em dev.

**0.3 — Deploy na Vercel**
Conectar repo à Vercel; env vars de produção; deploy automático no push para `main`.
*Aceite:* URL pública servindo o app; push em `main` → deploy sem intervenção.

**0.4 — Base de testes e lint**
Vitest configurado; ESLint + typecheck no script `lint`; GitHub Action rodando ambos em PRs.
*Aceite:* PR com teste quebrado fica vermelho no GitHub.

---

## Fase 1 — Fundação (identidade, dados, casca do app)

**Objetivo:** login funcionando, schema completo no banco, navegação das 5 áreas.

**1.1 — Migrations do schema completo** *(dep: 0.2)*
Todas as tabelas de `/docs/modelo-de-dados.md` em migrations: tipos, CHECKs, uniques, índices iniciais, triggers de `updated_at`.
*Aceite:* `supabase db reset` aplica tudo limpo; inserts de exemplo respeitam constraints (testar violações esperadas).

**1.2 — RLS em todas as tabelas** *(dep: 1.1)*
Policies `user_id = auth.uid()` em toda tabela de usuário; policy de `profiles` por `id`.
*Aceite:* teste automatizado com dois usuários — cada um enxerga apenas os próprios dados em todas as tabelas.

**1.3 — Autenticação** *(dep: 1.1)*
Supabase Auth com e-mail/senha + Google; criação automática de `profiles` no signup (trigger); rotas protegidas por middleware; telas de login/cadastro com componentes shadcn.
*Aceite:* fluxo completo de cadastro → login → logout; rota protegida redireciona anônimo.

**1.4 — Shell de navegação** *(dep: 1.3)*
As 5 áreas com rotas; bottom tab bar (mobile) e sidebar (desktop); header com slot do indicador de sync (estático por ora); cada área com placeholder do seu estado vazio conforme spec.
*Aceite:* navegação fluida nas 5 áreas em viewport mobile e desktop; dark mode íntegro.

**1.5 — Perfil: dados do atleta e limiares** *(dep: 1.4)*
Seções 1 e 2 da spec do Perfil: form de dados pessoais; limiares com histórico (`athlete_thresholds` — atualizar cria registro novo, nunca edita); tabela de zonas derivada (read-only).
*Aceite:* atualizar um limiar preserva o registro anterior; zonas recalculam na tela; validações de form funcionam.

**Checkpoint Fase 1:** criar conta real, preencher perfil e limiares, navegar tudo no celular.

---

## Fase 2 — Dados reais (Garmin, métricas, Feed)

**Objetivo:** treinos entrando sozinhos, TSS/PMC calculados, Feed vivo. O app vira útil aqui.

**2.1 — Biblioteca de métricas (funções puras)** *(sem dep de UI; pode ser paralela)*
`/lib/metrics`: TSS por potência (bike), por pace (corrida/natação via CSS), hrTSS, fallback fixo de força (40/h); NP, IF; CTL/ATL/TSB incremental; zonas por limiar.
*Aceite:* testes unitários com valores canônicos (1h no FTP = 100 TSS; NP de série conhecida; PMC de sequência conhecida) — a suíte mais importante do projeto.

**2.2 — Login Garmin e tokens** *(dep: 1.5)*
Fluxo da spec Perfil > Conexão: credenciais usadas uma vez, tokens criptografados (AES-256-GCM) em `garmin_connections`, senha jamais persistida/logada; estados de conexão; desconectar.
*Aceite:* conectar conta real → status `active`; inspeção do banco mostra apenas tokens cifrados; desconectar limpa tokens.

**2.3 — Motor de sync** *(dep: 2.2)*
Buscar atividades desde `last_sync_at`; baixar FIT para o Storage; dedupe por `(user_id, source, external_id)`; atualizar estado/erros da conexão; endpoint de sync por usuário + cron diário.
*Aceite:* rodar sync duas vezes seguidas não duplica nada; erro de credencial popula `last_error` sem quebrar nada.

**2.4 — Parser FIT → activities + streams** *(dep: 2.3, 2.1)*
Parsear FIT: colunas de resumo, `extra_metrics`, laps, zonas de tempo, streams reamostradas (5s, canais da spec), `route_polyline` simplificada; calcular TSS com limiar vigente + `threshold_snapshot`.
*Aceite:* importar arquivos reais das 3 modalidades + força; conferir métricas contra o Garmin Connect; atividade indoor sem GPS processa sem erro.

**2.5 — Atualização do PMC** *(dep: 2.4)*
`daily_metrics` incremental pós-sync; recálculo em cascata quando atividade passada muda/entra retroativa; CTL de partida a partir do histórico importado.
*Aceite:* teste de cascata — inserir atividade retroativa recalcula tudo dali em diante corretamente.

**2.6 — Sync-on-open e indicador global** *(dep: 2.3)*
Throttle de 10 min; indicador do header com os estados da spec; ação manual secundária; atualização do Feed sem reload ao concluir.
*Aceite:* abrir o app após treino → atividade aparece sem toque; reaberturas em sequência não disparam sync repetido.

**2.7 — Feed** *(dep: 2.4, 2.6)*
Card completo da spec (header, visual — rota SVG de `route_polyline` / ilustrações indoor placeholder —, métricas por esporte, slot de headline, sparkline); agrupamento por dia; paginação por cursor; lazy render por viewport; estados vazios/erro.
*Aceite:* Feed com 50+ atividades rola fluido no mobile; cards por esporte mostram as métricas certas; estados de primeira conexão funcionam.

**2.8 — Detalhe da atividade (v1)** *(dep: 2.7)*
Rota compartilhada: resumo completo (colunas + `extra_metrics` existentes), gráficos das streams por canal, laps, mapa interativo (Leaflet + OSM) quando houver GPS, tempo em zonas.
*Aceite:* detalhe das 3 modalidades renderiza com os dados disponíveis; sem stream → tela degrada com elegância.

**2.9 — Importar 90 dias no onboarding** *(dep: 2.5)*
Primeira conexão dispara importação histórica com progresso visível; deriva estimativas de limiar (`data_estimate`) dos melhores esforços.
*Aceite:* conta nova com Garmin ativo termina o fluxo com Feed populado, PMC com curva e limiares estimados no Perfil.

**Checkpoint Fase 2:** usar por 1–2 semanas reais de treino (você + 1 beta). O PMC e o Feed devem estar confiáveis antes da IA entrar.

---

## Fase 3 — O plano (gerador, Calendário, página Plano)

**3.1 — Base de conhecimento** *(sem dep)*
`/lib/ai/knowledge/`: princípios por modalidade e fase, regras de interação/recuperação, progressão de força, 2–3 treinos exemplares por modalidade (few-shot). Trabalho conjunto com curadoria humana.
*Aceite:* revisão humana dos arquivos; referenciados pelo prompt do gerador.

**3.2 — Infra de IA** *(dep: 0.2)*
Cliente Anthropic server-side; `ai_logs`; schemas Zod dos três contratos; retry com erro anexado; versionamento de prompt.
*Aceite:* chamada de teste registra log completo; resposta inválida simulada segue o fluxo retry → falha.

**3.3 — Onboarding do plano (formulário)** *(dep: 2.9)*
Fluxo multi-step da spec dos contratos: objetivo (prova opcional), confirmação de dados do histórico, disponibilidade, limiares; `form_snapshot`.
*Aceite:* fluxo completo nos dois modos (`race`/`fitness`), com e sem histórico Garmin.

**3.4 — plan-generator** *(dep: 3.1, 3.2, 3.3)*
Contrato 1 completo: geração rolante (estratégia, fases, esqueletos, 2 semanas), validações determinísticas (coerência de treino/semana/rampa), estado `generating`, persistência transacional.
*Aceite:* planos gerados para 3 perfis distintos (iniciante 70.3, veterano olímpico, modo fitness) passam em todas as validações; tempos e falhas visíveis em `ai_logs`.

**3.5 — Calendário** *(dep: 3.4)*
Spec completa: vistas semana/mês, chips com todos os estados, faixa de fase, resumo semanal, Sheet do treino planejado (vincular / pular com motivo / mover na semana).
*Aceite:* semanas com planejado+realizado legíveis no mobile; mover e pular refletem no banco; semanas futuras mostram esqueleto.

**3.6 — Matching planejado ↔ realizado** *(dep: 3.5)*
Regra do modelo de dados pós-sync (data+esporte, `completed`/`partial` por 70% da duração); vinculação manual pelo Sheet e pelo detalhe.
*Aceite:* casos: 1 candidato (auto), 0 e 2+ (manual), parcial — todos com badges corretos no Feed e Calendário.

**3.7 — Página Plano** *(dep: 3.4)*
Spec completa exceto aprovação de ajustes: cabeçalho por `goal_type`, estratégia, timeline de fases, card da etapa com status determinístico, ação "solicitar revisão" (grava intenção).
*Aceite:* status da etapa confere com as regras 85/99% em cenários simulados; timeline correta nos dois modos.

**Checkpoint Fase 3:** gerar seu plano real e segui-lo por uma semana.

---

## Fase 4 — O ciclo adaptativo (insights, revisor, Progresso)

**4.1 — insight-generator** *(dep: 3.2, 2.7)*
Contrato 3 no pipeline pós-sync; headline no card com placeholder/shimmer; texto completo no detalhe.
*Aceite:* insight chega < 30s após sync; treino vinculado comenta execução vs. prescrito; custo por insight visível em `ai_logs`.

**4.2 — plan-reviewer: revisão semanal** *(dep: 3.4, 3.6)*
Cron de domingo: avaliação da semana + materialização da próxima a partir do esqueleto; `adjustment_needed:false` como caminho normal; ajustes → `plan_adjustments` `proposed`.
*Aceite:* semana normal materializa a próxima sem propor ajuste; semana com 50% de aderência gera proposta coerente.

**4.3 — Aprovação de ajustes** *(dep: 4.2)*
Card de proposta no Plano (diff legível de `human_summary`), aprovar (transação aplica diff) / rejeitar (motivo); card-anúncio no Feed; histórico de ajustes.
*Aceite:* aprovar altera exatamente o proposto; rejeitar não altera nada; tudo auditável no histórico.

**4.4 — Gatilhos extraordinários** *(dep: 4.2)*
`high_fatigue`, `low_adherence`, `phase_end` (com avaliação da fase), `user_request` com contexto livre.
*Aceite:* cada gatilho dispara nas condições da spec e nunca fora delas (testes com dados simulados).

**4.5 — Página Progresso** *(dep: 2.5, 3.4)*
Spec completa: PMC com faixas de TSB e projeção futura + marca da prova, educação embutida, distribuição por esporte, evolução de limiares + registrar teste.
*Aceite:* projeção bate com `planned_tss` futuros; períodos alternam correto; Popovers educativos presentes.

**4.6 — Ilustrações indoor + polimento do Feed** *(dep: 2.7; assets do designer)*
Substituir placeholders pelas ilustrações finais por modalidade; refinos visuais acumulados.
*Aceite:* revisão visual do designer aprovada.

**Checkpoint Fase 4 / Beta:** ciclo completo rodando com você por 2+ semanas → convidar os ~20 atletas.

---

## Estacionamento (v2 consciente)
Strava/Garmin API oficial como fonte alternativa · drag-and-drop no calendário · edição manual de zonas · unidades imperiais · brick composto · exportar treino estruturado para o relógio · retrospectiva rica de temporada · multi-planos.
