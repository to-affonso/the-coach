import type { FitSession } from "@/lib/garmin/fit-parser"

/**
 * Catch-all de métricas de resumo que variam por dispositivo/esporte e não
 * têm coluna própria (modelo-de-dados.md > activities.extra_metrics). Só
 * inclui o que existir na sessão — nunca grava chave com valor ausente.
 */
export function extractExtraMetrics(
  session: FitSession | undefined
): Record<string, number | string> {
  if (!session) return {}

  const metrics: Record<string, number | string> = {}

  if (session.total_calories !== undefined)
    metrics.calories = session.total_calories
  if (session.avg_stroke_count !== undefined)
    metrics.avg_stroke_count = session.avg_stroke_count
  if (session.pool_length !== undefined)
    metrics.pool_length_m = session.pool_length
  if (session.swim_stroke !== undefined)
    metrics.swim_stroke = session.swim_stroke
  if (session.left_right_balance !== undefined)
    metrics.left_right_balance = session.left_right_balance
  if (session.total_training_effect !== undefined)
    metrics.training_effect = session.total_training_effect

  return metrics
}
