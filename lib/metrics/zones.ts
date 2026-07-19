/**
 * Zonas derivadas do limiar vigente de cada esporte (spec-telas.md, Perfil > Limiares e zonas).
 * Funções puras — sem I/O. Unidades de saída iguais às de armazenamento
 * (watts, bpm, segundos); conversão para min/km ou min/100m é só de exibição.
 */

export interface Zone {
  zone: number
  label: string
  /** Limite inferior (unidade da métrica). null = zona aberta para baixo. */
  min: number | null
  /** Limite superior (unidade da métrica). null = zona aberta para cima. */
  max: number | null
}

interface HigherIsHarderBound {
  label: string
  /** % do valor de referência (limite inferior da zona), null = aberta para baixo. */
  minPct: number | null
  /** % do valor de referência (limite superior da zona), null = aberta para cima. */
  maxPct: number | null
}

function zonesFromHigherIsHarderBounds(
  reference: number,
  bounds: HigherIsHarderBound[]
): Zone[] {
  return bounds.map((bound, index) => ({
    zone: index + 1,
    label: bound.label,
    min: bound.minPct === null ? null : Math.round((bound.minPct / 100) * reference),
    max: bound.maxPct === null ? null : Math.round((bound.maxPct / 100) * reference),
  }))
}

/** Pace (s/km ou s/100m): percentual maior = mais lento, então a relação com min/max se inverte. */
function zonesFromPaceBounds(
  thresholdPace: number,
  bounds: HigherIsHarderBound[]
): Zone[] {
  return bounds.map((bound, index) => ({
    zone: index + 1,
    label: bound.label,
    // maxPct (mais lento) vira o limite superior do pace; minPct vira o inferior.
    min: bound.minPct === null ? null : Math.round((bound.minPct / 100) * thresholdPace),
    max: bound.maxPct === null ? null : Math.round((bound.maxPct / 100) * thresholdPace),
  }))
}

/** Bike — 7 zonas de potência, modelo Coggan (% do FTP). */
export function computeBikePowerZones(ftpWatts: number): Zone[] {
  return zonesFromHigherIsHarderBounds(ftpWatts, [
    { label: "Recuperação ativa", minPct: null, maxPct: 55 },
    { label: "Resistência", minPct: 55, maxPct: 75 },
    { label: "Tempo", minPct: 76, maxPct: 90 },
    { label: "Limiar", minPct: 91, maxPct: 105 },
    { label: "VO2max", minPct: 106, maxPct: 120 },
    { label: "Capacidade anaeróbica", minPct: 121, maxPct: 150 },
    { label: "Potência neuromuscular", minPct: 150, maxPct: null },
  ])
}

/** Corrida — 5 zonas de pace (s/km), equivalente ao Coggan adaptado (% do pace limiar). */
export function computeRunPaceZones(thresholdPaceSecPerKm: number): Zone[] {
  return zonesFromPaceBounds(thresholdPaceSecPerKm, [
    { label: "Recuperação", minPct: 129, maxPct: null },
    { label: "Resistência", minPct: 114, maxPct: 129 },
    { label: "Ritmo/Tempo", minPct: 106, maxPct: 113 },
    { label: "Limiar", minPct: 100, maxPct: 105 },
    { label: "VO2max", minPct: null, maxPct: 100 },
  ])
}

/** Natação — 5 zonas de pace (s/100m), % do CSS. */
export function computeSwimPaceZones(cssSecPer100m: number): Zone[] {
  return zonesFromPaceBounds(cssSecPer100m, [
    { label: "Recuperação", minPct: 115, maxPct: null },
    { label: "Resistência", minPct: 106, maxPct: 115 },
    { label: "Ritmo", minPct: 102, maxPct: 105 },
    { label: "Limiar (CSS)", minPct: 98, maxPct: 101 },
    { label: "Velocidade", minPct: null, maxPct: 98 },
  ])
}

/** FC — 5 zonas, modelo Friel/Coggan (% do LTHR do esporte, ou FC máx. como fallback). */
export function computeHrZones(lthrOrMaxHrBpm: number): Zone[] {
  return zonesFromHigherIsHarderBounds(lthrOrMaxHrBpm, [
    { label: "Zona 1", minPct: null, maxPct: 81 },
    { label: "Zona 2", minPct: 81, maxPct: 89 },
    { label: "Zona 3", minPct: 90, maxPct: 93 },
    { label: "Zona 4", minPct: 94, maxPct: 99 },
    { label: "Zona 5", minPct: 100, maxPct: null },
  ])
}
