# Backlog faseado — v1

Sequência de tarefas para o desenvolvimento via Claude Code. Cada tarefa foi dimensionada para caber em uma sessão, tem dependências explícitas e um critério de aceite verificável. Regras de uso:

- **Uma tarefa por branch/PR.** A tarefa só está pronta quando o critério de aceite passa e `npm run test && npm run lint` está verde.
- **Ordem importa dentro da fase**; entre tarefas sem dependência declarada, a ordem é livre.
- Decisão não coberta pelos docs → **parar e perguntar** (regra do CLAUDE.md).
- Ao fim de cada fase há um **checkpoint de uso real**: usar o app de verdade antes de seguir — bugs de fundação custam caro depois.
- **Fluxo de PR na prática:** commit na branch da tarefa → push → o humano abre o PR no GitHub → checar CI via API do GitHub (`gh` CLI não está disponível neste ambiente; usar `curl` na API REST) → depois de CI verde e confirmação do humano, merge **fast-forward** direto em `main` (sem squash) → conferir o deploy de produção na Vercel (também via API/deployments).

---

## Fases 0–2 — concluídas (resumo para continuidade)

As tarefas originais 0.1–0.4, 1.1–1.5 e 2.1–2.9 foram implementadas, revisadas e mescladas em `main` (histórico completo nos commits/PRs do GitHub — não reproduzido aqui). Esta seção substitui o backlog item-a-item dessas fases por um resumo orientado a quem for continuar o desenvolvimento, humano ou IA.

### O que já existe e funciona, em produção

- **Fundação:** Next.js (App Router) + TypeScript na Vercel, deploy automático em push pra `main`; Supabase (Postgres/Auth/Storage) com schema completo e RLS em toda tabela; Vitest + ESLint/typecheck rodando em CI.
- **Identidade:** Auth por e-mail/senha e Google; as 5 áreas navegáveis (bottom tab bar mobile / sidebar desktop); Perfil com dados do atleta, limiares com histórico (nunca edita, sempre cria registro novo) e zonas derivadas read-only.
- **Garmin:** conectar/desconectar com tokens cifrados (AES-256-GCM), senha nunca persistida; sync incremental de rotina (últimas atividades) e importação histórica de 90 dias disparada automaticamente na primeira conexão, com estimativa de limiares (`data_estimate`) a partir dos melhores esforços encontrados no histórico.
- **Parser FIT:** métricas de resumo, `extra_metrics`, laps, tempo em zonas, streams reamostradas (5s), `route_polyline`, TSS calculado com o limiar vigente na data e congelado em `threshold_snapshot`.
- **PMC:** `daily_metrics` (CTL/ATL/TSB) atualizado incrementalmente após cada sync, com recálculo em cascata quando uma atividade retroativa entra.
- **Sync-on-open:** throttle de 10min ao abrir/focar o app, indicador global no header (estados ok/sincronizando/erro) com ação manual "Sincronizar agora".
- **Feed:** cards por esporte (métricas certas por modalidade, thumbnail SVG da rota ou ícone indoor, sparkline lazy), agrupamento por dia, paginação por cursor, estados vazio/erro/aguardando-primeiro-sync.
- **Detalhe da atividade** (rota compartilhada `/atividades/[id]`): resumo completo, tempo em zonas, laps, gráficos por canal da stream, mapa interativo (Leaflet + OSM) quando há GPS.

### Onde as coisas vivem (orientação rápida)

- `/lib/metrics` — funções puras (TSS, PMC, zonas, best-effort, hrTSS, NP/IF), todas com teste unitário. Novo cálculo determinístico entra aqui, nunca com I/O.
- `/lib/garmin` — `sync.ts` (incremental de rotina), `historical-import.ts` (primeira conexão, 90 dias), `sync-dispatch.ts` (decide qual dos dois rodar, com base em `garmin_connections.last_sync_at`), `process-activity.ts` (pipeline por atividade, compartilhado pelos dois sincs), `fit-parser.ts`, `auth.ts`/`crypto.ts` (tokens), `threshold-estimation.ts`.
- `/lib/db` — `admin.ts` (service role, bypassa RLS, só server-side sem sessão), `server.ts`/`client.ts` (sessão do usuário), `activities.ts`/`daily-metrics.ts` (queries reusadas pelas páginas).
- `/components/feed`, `/components/atividade`, `/components/perfil` — um pacote de componentes por área da spec; `/hooks/use-in-view.ts` cobre o lazy-render por viewport usado no Feed.
- `/app/(app)` — rotas autenticadas (Feed é `/`, `atividades/[id]` é o detalhe); `/app/api` — endpoints de sync (por usuário e cron diário), sempre chamando `sync-dispatch.ts`, nunca os módulos internos direto.
- `/docs/modelo-de-dados.md`, `spec-telas.md`, `contratos-ia.md` — fonte da verdade. Toda decisão tomada em chat que não estava no doc original tem uma nota inline `"(decisão tomada no chat de planejamento, X.Y)"` — vale a pena `grep` por isso antes de mexer num arquivo relacionado, pra não contradizer uma decisão já tomada.

### Débitos e decisões conhecidas (ler antes de continuar)

- **Cor por esporte** reaproveita a paleta genérica `--color-chart-1..4` (sem tokens dedicados por modalidade ainda) — ver `spec-telas.md`. Se o produto ganhar identidade visual própria por esporte, o mapeamento fica todo em `lib/sport-theme.ts`.
- **`activities.name`** existe desde a 2.7 (migration `activities_add_name`), populado com `activity.activityName` do Garmin. Atividades sincronizadas antes dessa coluna existir ficam com `name` nulo — sem backfill — e o card cai pro nome do esporte.
- **Sync incremental ineficiente:** hoje ele baixa e reenvia o FIT de toda atividade retornada pelo Garmin antes de descobrir (via violação da `UNIQUE` de `activities`) que ela já foi sincronizada. Funciona (dedupe correto), mas é lento — uma otimização futura seria checar quais `external_id` já existem no banco antes de baixar.
- **Ilustrações indoor** no Feed são só o ícone do esporte (placeholder) — as ilustrações reais dependem de assets do designer (tarefa 4.6, ainda não feita).
- **Slot de headline do insight** já existe no Feed e no Detalhe, mas fica vazio hoje — não há `insight-generator` ainda (4.1). Ele é omitido (não mostra "analisando..." fixo) até existir uma linha real em `activity_insights`.
- **Card de resumo semanal e card de proposta de ajuste** (ambos na spec do Feed) foram deixados de fora da 2.7 de propósito — dependem de `planned_workouts`/`plan_adjustments` (Fase 3/4), que ainda não existem. Construir uma versão parcial teria gerado retrabalho.
- **Sem suíte automatizada pro fluxo Garmin** (login, sync, importação histórica) — validado manualmente contra uma conta Garmin real via browser (`claude-in-chrome`) a cada tarefa. Rodar/testar isso localmente exige `.env.local` com um projeto Supabase real (linkado via MCP) e uma conta Garmin real conectada.
- **Badge de vínculo** (Cumprido/Parcial) no Feed já está implementado (lê `planned_workouts.matched_activity_id`/`status`), mas nunca aparece na prática ainda — o matching (3.6) e o próprio plano (3.4) não existem.

### Comandos básicos

```
npm run dev           # ambiente local
npm run test          # Vitest
npm run lint          # ESLint + tsc --noEmit
npx supabase migration new <nome>   # nova migration (depois aplicar via MCP supabase ou CLI)
```

---

## Checkpoint Fase 2 (em andamento)

Em vez de seguir direto pra Fase 3, a decisão em 2026-07-19 foi pausar a sequência do backlog para: (a) validar com mais uso real o comportamento do sync incremental e da importação histórica, e (b) revisar e melhorar UX/interface das telas já construídas (Feed, Detalhe, Perfil) antes de continuar. Ainda não há uma lista fixa de tarefas para esse período — a sessão que continuar este trabalho deve perguntar o que priorizar, em vez de assumir.

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
