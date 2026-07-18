# CLAUDE.md — The Coach

**Repositório:** https://github.com/to-affonso/the-coach.git

## O que é este projeto

**The Coach**: aplicação web de planejamento e acompanhamento de treinos de triathlon (estilo TrainingPeaks / intervals.icu, sem componente social). Um plano periodizado é gerado por IA a partir de um formulário; treinos realizados chegam via sync com Garmin Connect; métricas (TSS, PMC) são calculadas de forma determinística; a IA traduz dados em insights e propõe ajustes ao plano em cadências controladas.

Escala alvo: ~20 usuários. Custo de infraestrutura: zero (free tiers).

## Stack

- **Next.js (App Router) + TypeScript** — frontend e backend no mesmo projeto
- **Supabase** — Postgres, Auth, Storage (arquivos FIT)
- **Vercel** — hosting e cron jobs
- **Anthropic API** (claude-haiku para insights; claude-sonnet para geração/revisão de planos)
- **Zod** — validação de toda entrada externa e toda saída de IA
- **shadcn/ui (base Radix) + Tailwind** — componentes de UI com tema via preset

## UI e design system

- Setup reproduzível do design system (comando canônico — usar exatamente este preset):
  `npx shadcn@latest init --preset buFzqoK --base radix --template next --pointer`
- A skill oficial `shadcn/skills` deve estar instalada no projeto — consultá-la antes de trabalhar com componentes.
- Componentes de UI vêm do shadcn via CLI (`npx shadcn@latest add <componente>`) para `/components/ui`. Antes de criar um componente do zero, verificar se existe equivalente no shadcn.
- Componentes de `/components/ui` podem ser customizados (o código é nosso), mas alterações devem preservar acessibilidade (Radix) e usar tokens.
- **Proibido cor, raio ou sombra hardcoded.** Todo valor visual vem dos tokens do tema (variáveis CSS do preset / classes Tailwind mapeadas). Se um token necessário não existe, PARAR e perguntar — o tema é decisão de design, não do executor.
- Dark mode: suportado pelo tema desde o início; nenhum componente pode quebrar em dark mode.

## Estrutura de pastas

```
/app                 → rotas e páginas (App Router)
/components          → componentes React reutilizáveis
/lib
  /ai
    insight-generator.ts   → insight pós-treino
    plan-generator.ts      → formulário → plano completo
    plan-reviewer.ts       → revisão semanal / de etapa
    schemas.ts             → schemas Zod das saídas de IA
  /metrics           → TSS, hrTSS, NP, IF, PMC (funções puras, sem I/O)
  /garmin            → login, tokens, sync, parser FIT
  /db                → clientes Supabase e queries
/supabase/migrations → toda alteração de schema vive aqui
/docs                → documentos de planejamento (fonte da verdade)
```

## Regras invioláveis

1. **Schema só muda via migration** em `/supabase/migrations`, refletida em `/docs/modelo-de-dados.md`. Nunca alterar tabelas pelo dashboard do Supabase.
2. **Toda saída de IA passa por Zod antes de tocar o banco.** Resposta inválida → retry (máx. 2) → falha registrada em `ai_logs`. Nunca aplicar JSON não validado.
3. **A IA nunca escreve diretamente em `plan_phases` ou `planned_workouts`.** Ela grava propostas em `plan_adjustments`; a aplicação aplica o diff somente após aprovação do usuário, em transação.
4. **Ajustes de plano existem apenas nos níveis `week` e `phase`.** Nunca criar fluxo que reestruture o plano por causa de um único treino.
5. **A senha do Garmin nunca é persistida.** Login uma vez → tokens criptografados (AES-256-GCM, chave em env var) → senha descartada. Tokens nunca aparecem em logs.
6. **TSS é imutável.** Calculado com o limiar vigente na data (`athlete_thresholds`, `effective_from`), congelado em `threshold_snapshot`. Mudança de limiar não recalcula o passado.
7. **Alteração em atividade passada dispara recálculo em cascata** de `daily_metrics` daquela data em diante.
8. **RLS em toda tabela nova**, com `user_id = auth.uid()`. Tabelas filhas denormalizam `user_id`.
9. **Cálculos de métricas são funções puras** em `/lib/metrics`, cobertas por testes unitários com valores conhecidos (ex.: 1h exatamente no FTP = 100 TSS).
10. **Segredos só em variáveis de ambiente.** Nada de chave em código, nem em arquivo commitado.

## Convenções

- Componentes React: função + hooks; nomes em inglês; texto de UI em pt-BR.
- Datas: armazenar em UTC (`timestamptz`); converter para o `timezone` do perfil apenas na borda (UI e virada de dia do PMC).
- Unidades canônicas no banco: metros, segundos, watts, bpm. Conversões (pace min/km, min/100m) só na exibição.
- Erros de integração Garmin nunca quebram a UI: registrar em `garmin_connections.last_error` e mostrar estado de conexão degradado.
- Commits pequenos e descritivos; uma tarefa do backlog por branch/PR.

## Fluxo de trabalho

- Os documentos em `/docs` são a fonte da verdade (modelo de dados, specs de telas, contratos de IA, backlog).
- **Ao encontrar uma decisão não coberta pelos documentos: PARAR e perguntar.** Não tomar decisões arquiteturais silenciosas. A decisão será tomada no chat de planejamento, o documento será atualizado, e então a implementação continua.
- Ao concluir uma tarefa do backlog, validar o critério de aceite antes de seguir para a próxima.

## Comandos

```
npm run dev          → ambiente local
npm run test         → testes (obrigatório passar antes de commit)
npm run lint         → lint + typecheck
npx supabase migration new <nome>  → nova migration
```
