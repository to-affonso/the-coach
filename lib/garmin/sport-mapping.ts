export type SyncableSport = "swim" | "bike" | "run" | "strength"

/**
 * Garmin rastreia muito mais tipos de atividade (caminhada, trilha, golfe,
 * ioga, esqui...) do que o vocabulário do app, que é focado em triathlon
 * (swim/bike/run/strength — brick nunca chega assim do Garmin: doc
 * "Fora do escopo da v1" já explica que um brick real chega como duas
 * atividades separadas, bike + run). Atividades fora desse vocabulário são
 * puladas no sync — o histórico de treinos do Garmin não precisa caber
 * inteiro no app, só o que é relevante para o plano.
 */
export function mapGarminSportType(typeKey: string): SyncableSport | null {
  const key = typeKey.toLowerCase()

  if (key.includes("running")) return "run"
  if (key.includes("cycling") || key.includes("biking") || key.includes("ride"))
    return "bike"
  if (key.includes("swimming")) return "swim"
  if (key.includes("strength") || key.includes("cardio") || key.includes("fitness_equipment"))
    return "strength"

  return null
}
