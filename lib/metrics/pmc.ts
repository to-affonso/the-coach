const CTL_TIME_CONSTANT_DAYS = 42
const ATL_TIME_CONSTANT_DAYS = 7

export interface DailyTss {
  date: string
  tss: number
}

export interface PmcPoint extends DailyTss {
  ctl: number
  atl: number
  /** Forma no início do dia (antes do TSS de hoje entrar): CTL de ontem − ATL de ontem. */
  tsb: number
}

/**
 * PMC incremental (médias móveis exponenciais, convenção TrainingPeaks/Coggan):
 * CTL_hoje = CTL_ontem + (TSS_hoje − CTL_ontem)/42
 * ATL_hoje = ATL_ontem + (TSS_hoje − ATL_ontem)/7
 * TSB_hoje = CTL_ontem − ATL_ontem (a forma com que o atleta chega no dia,
 * antes do treino de hoje afetar o acumulado).
 * `dailyTss` deve vir em ordem cronológica, um ponto por dia (sem lacunas —
 * dias sem treino entram com tss: 0).
 */
export function computePmcSeries(
  dailyTss: DailyTss[],
  initialCtl = 0,
  initialAtl = 0
): PmcPoint[] {
  let ctl = initialCtl
  let atl = initialAtl
  const series: PmcPoint[] = []

  for (const { date, tss } of dailyTss) {
    const tsb = ctl - atl
    ctl = ctl + (tss - ctl) / CTL_TIME_CONSTANT_DAYS
    atl = atl + (tss - atl) / ATL_TIME_CONSTANT_DAYS
    series.push({ date, tss, ctl, atl, tsb })
  }

  return series
}
