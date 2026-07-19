# Especificação das telas — v1

Especificação funcional das cinco áreas do app. Este documento define **o que** cada tela mostra e como se comporta; o **como visual** (espaçamentos, hierarquia fina, microinterações) é refinado pelo designer durante a implementação. Componentes referenciados pelo nome do shadcn/ui quando aplicável.

## Princípios globais

**Navegação.** Cinco áreas: Feed (home), Calendário, Plano, Progresso, Perfil. Mobile: bottom tab bar fixa com ícone + rótulo. Desktop: sidebar esquerda recolhível. A rota raiz `/` é o Feed.

**Mobile-first.** O momento de uso dominante é pós-treino, no celular. Toda tela é projetada primeiro para viewport estreita; desktop expande (mais colunas, mais densidade), nunca o contrário.

**Sync automático ao abrir.** Ao abrir o app ou trazê-lo de volta ao foco, se o último sync tem mais de **10 minutos**, um sync é disparado automaticamente em background — nunca bloqueante. O throttle protege a integração não-oficial (frequência excessiva arrisca bloqueio da conta Garmin) e evita flicker de UI a cada troca de aba. Complementos: cron diário no servidor e ação manual "Sincronizar agora" rebaixada a item secundário dentro do indicador de status (caso de uso: "acabei o treino, quero ver já").

**Indicador de sync global.** Discreto no header (todas as telas): estado da conexão + timestamp do último sync. Estados: `ok` (silencioso), `sincronizando` (spinner), `erro/expirado` (destaque de atenção, tap → Perfil > Conexão). Erros de sync nunca bloqueiam a navegação. Quando um sync termina com atividades novas, o Feed se atualiza sem reload.

**Lazy loading como padrão.** Listas longas são paginadas por cursor e carregadas sob demanda no scroll. Conteúdo pesado dentro de itens (sparklines, thumbnails de rota, imagens) só renderiza quando o item entra no viewport (Intersection Observer), com placeholder de dimensão fixa para não haver salto de layout. O custo de renderização acompanha o scroll, não o tamanho do histórico.

**Estados obrigatórios em toda tela:** carregando (Skeleton na forma do conteúdo final, nunca spinner de página inteira), vazio/primeiro uso (explicação + ação primária), erro (Alert com mensagem legível + ação de retry). Nenhuma tela pode renderizar "branco".

**Linguagem.** Métricas técnicas sempre acompanhadas de tradução acessível quando aparecem pela primeira vez no contexto. Termos: usamos "Fitness" (CTL), "Fadiga" (ATL) e "Forma" (TSB) na UI; a sigla técnica aparece como detalhe secundário.

**Unidades (v1):** sistema métrico fixo (km, m, min/km, min/100m, watts, bpm). Preferência de unidades imperial fica para v2.

---

## 1. Feed (home)

**Papel:** consumo do realizado — "terminei o treino, como eu fui?". Lista cronológica inversa de atividades, com o insight da IA como protagonista da narrativa.

### Estrutura

Lista vertical única, agrupada por dia (separador de data pegajoso: "Hoje", "Ontem", "Ter, 14 jul"). Paginação infinita por cursor (`start_time`), 15 itens por página, com estado de fim de lista.

### Card de atividade (componente central do produto)

Anatomia, de cima para baixo:

1. **Header:** ícone do esporte (cor do token por modalidade) + título da atividade + horário. Badge de vínculo quando houver match com treino planejado: `Cumprido` / `Parcial` / sem badge se atividade avulsa.
2. **Visual da atividade (âncora visual do card):**
   - **Com GPS:** o traçado da rota renderizado como **SVG puro a partir de `route_polyline`** — a linha do percurso sobre fundo de token do tema, sem tiles de mapa. Justificativa: identidade visual única por treino (estética de pôster), custo zero (sem chave de API, sem cota), e mais privacidade no thumbnail. O mapa real e interativo vive só no detalhe.
   - **Sem GPS (indoor):** ilustração fixa por modalidade — rolo, esteira, piscina, força. Assets próprios do produto (oportunidade de identidade visual).
   - Renderizado apenas quando o card entra no viewport; placeholder de dimensão fixa antes disso.
3. **Linha de métricas:** 3–4 métricas-chave em destaque, específicas por esporte:
   - **Bike:** duração · distância · potência (NP se existir, senão média) · TSS
   - **Corrida:** duração · distância · pace médio · FC média
   - **Natação:** distância · pace/100m · duração · TSS
   - **Força:** duração · TSS · FC média (se houver)
   - Métrica ausente (sem sensor) é omitida, nunca exibida como "—" solto; o layout se adapta.
4. **Headline do insight:** a frase única de `activity_insights.headline`, tipograficamente distinta (é a "voz do treinador"). Enquanto o insight processa: placeholder "Analisando seu treino…" com shimmer, atualizado sem reload quando pronto.
5. **Sparkline:** mini-gráfico da série principal do esporte (potência na bike, pace na corrida, pace na natação), sem eixos, ~40px de altura. Ausente se não houver stream. Renderizado sob demanda (viewport), como o visual da atividade.

Tap no card → tela de detalhe da atividade (rota própria, spec futura).

### Itens intercalados no Feed

- **Card de resumo semanal:** inserido na virada da semana (posição: acima do primeiro dia da nova semana). Conteúdo: TSS total vs planejado, horas por esporte (mini stacked bar), aderência da semana em %. Tap → Calendário na semana correspondente.
- **Card de proposta de ajuste pendente:** quando existe `plan_adjustments` com `status = 'proposed'`, fixado no topo do Feed com destaque visual de atenção. Conteúdo: nível (semana/etapa), gatilho em linguagem humana, primeira linha do racional. Ações: `Ver proposta` (→ página Plano) e nunca aprovar direto do Feed (aprovação exige ver o diff completo).

### Estados

- **Nunca conectou Garmin:** ilustração + "Conecte seu Garmin para ver seus treinos aqui" + Button primário → Perfil > Conexão. Secundário: "Adicionar treino manual" (v1 mínimo: form simples de atividade manual).
- **Conectado, aguardando primeiro sync:** o primeiro sync dispara automaticamente ao conectar; a tela mostra progresso ("Importando seus treinos…") + skeletons. Sem ação manual necessária.
- **Sync em andamento:** skeletons de card no topo da lista + indicador no header.
- **Erro de conexão:** Alert no topo ("Não conseguimos falar com o Garmin — reconectar") sem esconder as atividades já sincronizadas.

### Dados

`activities` (paginado) + `activity_insights` (mais recente por atividade) + `planned_workouts` (via `matched_activity_id`) + agregação semanal de `daily_metrics`.

---

## 2. Calendário

**Papel:** planejado vs. realizado no tempo — "onde estou no plano?". É a tela de planejamento; o Feed é a de consumo.

### Estrutura

- **Vista Semana** (default no mobile): 7 dias empilhados verticalmente, hoje destacado e com scroll inicial posicionado nele.
- **Vista Mês** (default no desktop): grade clássica. Alternância via Tabs no topo.
- **Faixa de fase:** uma faixa fina contínua acima dos dias indicando a etapa do plano (cor por tipo: base/build/peak/taper) com rótulo. Conecta visualmente o calendário à página Plano.
- **Resumo por semana** (linha ao fim de cada semana): TSS planejado vs. realizado, horas totais, barra de aderência.

### O chip de treino (célula do dia)

Cada treino é um chip com ícone do esporte + título curto + duração. Estados visuais distintos e não ambíguos:

| Estado | Representação |
|---|---|
| Planejado futuro | Contorno (outline), cor do esporte |
| Realizado com vínculo (`completed`) | Preenchido, cor do esporte, check |
| Realizado parcial (`partial`) | Preenchido, indicador de parcial |
| Pulado (`skipped`) | Esmaecido, título tachado |
| Realizado sem vínculo (avulso) | Preenchido, neutro |
| Descanso planejado (`rest`) | Chip discreto "Descanso" — dia de descanso ≠ dia vazio |
| Treino-chave (`is_key_workout`) | Marcador de destaque (ex.: ponto/estrela) sobre qualquer estado acima |

### Interações

- **Tap em treino planejado** → Sheet (mobile) / Popover largo (desktop) com: descrição completa, estrutura do treino renderizada (passos/séries a partir de `structure`), TSS e duração planejados. Ações: `Vincular atividade` (lista atividades do mesmo dia sem vínculo), `Marcar como pulado` (com motivo opcional — alimenta a revisão semanal), `Mover de dia`.
- **Mover de dia:** permitido apenas dentro da mesma semana, via ação explícita no Sheet (drag-and-drop fica para v2 — em mobile, drag em lista vertical conflita com scroll). Mover é edição do usuário, não passa por IA nem gera `plan_adjustments`; a revisão semanal enxerga a mudança naturalmente.
- **Tap em atividade realizada** → detalhe da atividade (mesma rota do Feed).
- Navegação entre semanas/meses por swipe (mobile) e setas (desktop); botão "Hoje" sempre visível.

### Estados

- **Sem plano ativo:** calendário funciona mostrando apenas atividades realizadas + banner "Você ainda não tem um plano — criar plano" (→ formulário de onboarding do plano).
- **Semana de recuperação:** rótulo na faixa de resumo ("Semana de recuperação") para contextualizar o volume menor.
- **Passado sem dados:** dias anteriores à primeira atividade ficam simplesmente vazios, sem estado especial.

### Dados

`planned_workouts` por range de datas + `activities` por range + `plan_phases` (faixa) + agregações semanais.

---

## 3. Plano

**Papel:** a âncora narrativa — "qual é a estratégia, onde estou nela, estamos no caminho?". Única tela onde propostas de ajuste são aprovadas.

### Estrutura (de cima para baixo)

1. **Cabeçalho da temporada:** adapta-se ao `goal_type` — com prova: nome, data, tipo e contagem regressiva ("Faltam 14 semanas"); plano contínuo (`fitness`): nome do bloco atual e progresso do mesociclo ("Bloco de build · semana 3 de 8"). 
2. **Proposta pendente (condicional):** quando existe ajuste `proposed`, um Card de destaque no topo: nível, gatilho, racional completo, e o **diff legível por humanos** — lista de mudanças em linguagem natural ("Semana 12: volume reduzido de 9h para 7h; intervalado de quinta vira rodagem leve"), gerada a partir do `proposal` jsonb. Ações: `Aprovar` (Dialog de confirmação → aplica em transação) e `Rejeitar` (com motivo opcional — vira contexto para a próxima revisão).
3. **Estratégia:** o `strategy_text` gerado na criação do plano, em Collapsible (aberto no primeiro acesso, colapsado depois).
4. **Linha do tempo das etapas:** timeline horizontal (scrollável no mobile) com um segmento por fase — tipo, duração em semanas, e marcador "você está aqui" posicionado proporcionalmente à data atual. Fases concluídas com indicador de como terminaram (no alvo / fora).
5. **Card da etapa atual:** objetivo em texto + os alvos mensuráveis com progresso:
   - **Fitness (CTL):** valor atual vs. `target_ctl`, com Progress e projeção ("no ritmo atual, você chega a ~52 de 55").
   - **Aderência:** % de treinos cumpridos na fase vs. `min_adherence_pct`.
   - **Treinos-chave:** `x de y` completados.
   - **Selo de status da etapa**, calculado por regra determinística (sem IA): `No alvo` (projeção de CTL ≥ alvo E aderência ≥ mínimo), `Atenção` (qualquer indicador entre 85–99% do alvo), `Fora do alvo` (qualquer indicador < 85% — normalmente acompanhado de proposta de ajuste pendente). Tooltip explica o cálculo.
6. **Histórico de ajustes:** lista cronológica de `plan_adjustments` decididos — data, nível, gatilho, racional resumido, status. É a prova de que o organismo evolui com critério.
7. **Ação "Solicitar revisão":** botão secundário que dispara o revisor com `trigger = 'user_request'` (para "fiquei doente", "viajo semana que vem"). Abre input de contexto livre que é passado à IA.

### Estados

- **Sem plano:** a própria tela vira o convite — apresentação curta + Button primário "Criar meu plano". O fluxo começa pela conexão Garmin (se ainda não houver) e importação de histórico, e só então o formulário reduzido — ver onboarding em `/docs/contratos-ia.md`. Prova alvo não é obrigatória: o convite deixa claro que dá para treinar "por treinar".
- **Plano em geração:** estado de progresso ("Montando sua temporada…", 20–40s) com as etapas aparecendo conforme geradas, se viável; senão, skeleton + notificação ao concluir.
- **Prova concluída:** cabeçalho muda para retrospectiva mínima (v1: parabéns + números da temporada) + CTA de criar novo plano.

### Dados

`plans` (ativo) + `plan_phases` + `plan_adjustments` + `daily_metrics` (CTL atual e projeção com `planned_tss` futuros).

---

## 4. Progresso

**Papel:** a visão longitudinal — "estou evoluindo?". A tela mais "intervals.icu" do produto, e a que mais exige tradução de dados em linguagem leiga.

### Estrutura

1. **Seletor de período:** Tabs — `6 semanas` (default) / `3 meses` / `Temporada` (início do plano até a prova).
2. **Gráfico PMC (protagonista):** 
   - Fitness (CTL) como área/linha principal; Fadiga (ATL) como linha secundária; Forma (TSB) como barra ou linha em eixo próprio, com faixas de referência coloridas (muito fatigado < −25; zona produtiva de treino −25 a −5; fresco/prova > +5).
   - **Projeção futura:** linha tracejada de CTL/TSB projetados a partir dos `planned_tss` — mostra "se eu cumprir o plano, chego assim na prova". A data da prova é marcada verticalmente no gráfico. Esta é a visualização mais motivadora do produto.
   - Tooltip por dia: data, TSS do dia, os três valores.
   - **Educação embutida:** ícone "?" abre Popover explicando Fitness/Fadiga/Forma em 3 frases leigas cada. Público-alvo não conhece essas siglas; a tela fracassa se precisar de Google.
3. **Distribuição de carga por esporte:** stacked bars semanais (horas ou TSS — Toggle) por modalidade. Responde "estou negligenciando a natação?" de relance.
4. **Evolução de limiares:** um bloco por esporte com o valor vigente (FTP, pace limiar, CSS) + badge de origem (`teste` / `estimativa`) + step-chart do histórico de `athlete_thresholds`. Ação `Registrar teste` → form que cria novo registro com `effective_from` (nunca edita o passado — regra do modelo).

### Estados

- **Menos de 14 dias de dados:** o PMC renderiza, mas com Alert informativo: "Fitness e Fadiga são médias de 42 e 7 dias — os valores ficam confiáveis conforme seu histórico cresce". Nunca esconder o gráfico.
- **Sem plano ativo:** PMC e distribuição funcionam normalmente (dependem só de atividades); a projeção futura e a marca da prova simplesmente não aparecem.
- **Limiar só estimado (`ai_estimate`):** aviso persistente no bloco do esporte sugerindo o teste correspondente (ex.: natação: 400m + 200m).

### Dados

`daily_metrics` (histórico) + `planned_workouts` futuros (projeção) + `activities` agregadas por semana/esporte + `athlete_thresholds`.

---

## 5. Perfil

**Papel:** configuração e confiança — dados do atleta, limiares/zonas, e o estado da conexão Garmin com transparência total.

### Estrutura (seções com Separator)

1. **Dados do atleta:** nome, data de nascimento, sexo, peso, fuso horário (Select com busca). Form com salvamento explícito.
2. **Limiares e zonas:** um bloco por esporte:
   - Valor vigente de cada métrica + badge de origem (`manual` / `teste` / `estimativa IA`) + data de vigência.
   - `Atualizar` → Dialog: novo valor + data + origem → **cria novo registro** em `athlete_thresholds` (a UI deixa claro: "o histórico anterior permanece — seus treinos passados não são recalculados").
   - **Tabela de zonas derivada** (somente leitura na v1). Calculadas, não editáveis — edição manual é v2:
     - **Bike (potência):** 7 zonas, modelo Coggan, % do FTP.
     - **Corrida (pace):** 5 zonas, % do pace limiar (maior % = mais lento): Z1 Recuperação > 129% · Z2 Resistência 114–129% · Z3 Ritmo 106–113% · Z4 Limiar 100–105% · Z5 VO2max < 100%. (7 zonas não se aplicam a pace: nas intensidades altas as faixas comprimem abaixo do ruído de GPS; trabalho de sprint é prescrito por esforço/repetições, não por zona de pace.)
     - **Natação (pace):** 5 zonas, % do CSS (maior % = mais lento): Z1 Recuperação > 115% · Z2 Resistência 106–115% · Z3 Ritmo 102–105% · Z4 Limiar (CSS) 98–101% · Z5 Velocidade < 98%. Valores iniciais, calibráveis com uso.
     - **FC:** 5 zonas, modelo Friel/Coggan, % do LTHR do esporte (ou da FC máx. quando não houver LTHR registrado): Z1 <81% · Z2 81–89% · Z3 90–93% · Z4 94–99% · Z5 ≥100%.
3. **Conexão Garmin:** o centro de confiança da integração não-oficial:
   - Estado atual (Badge: Conectada / Expirada / Erro / Desconectada), último sync, próximo sync automático.
   - `Conectar`: Dialog com e-mail e senha Garmin + texto explícito: "Sua senha é usada uma única vez para autenticar e nunca é armazenada. Guardamos apenas tokens de sessão criptografados." Honestidade aqui é feature.
   - `Sincronizar agora`, `Reconectar` (quando expirada), `Desconectar` (Dialog de confirmação; remove tokens, mantém atividades já importadas).
   - Em erro: `last_error` traduzido para linguagem humana + orientação.
4. **Plano ativo:** atalho com resumo (prova, data) → página Plano. Ação destrutiva `Abandonar plano` (Dialog com confirmação por texto; muda status para `abandoned`, preserva histórico).
5. **Conta:** e-mail de login, `Sair`, `Excluir conta` (Dialog com confirmação por texto; exclusão em cascata + arquivos do Storage).

### Estados

- **Onboarding incompleto:** seções sem dados essenciais (peso, limiares) exibem indicador de pendência; o Feed pode apontar para cá.
- **Sem conexão:** seção Garmin em destaque como principal pendência.

---

## Fora do escopo desta spec (documentos futuros)

- **Detalhe da atividade** (rota compartilhada Feed/Calendário): spec própria na Fase 2, junto do parser FIT. Decisões já tomadas que a alimentam: exibir **todas** as métricas disponíveis (colunas + `extra_metrics`), gráficos por canal das streams, e mapa interativo (Leaflet + OpenStreetMap, gratuito) a partir de lat/lng das streams.
- **Formulário de criação do plano:** spec junto do contrato do `plan-generator` (item 4 do planejamento) — perguntas e schema de saída nascem juntos.
- **Detalhe do diff de proposta:** formato exato do `proposal` jsonb e sua renderização — junto do contrato do `plan-reviewer`.
