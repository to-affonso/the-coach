function formatPace(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function formatMetricValue(
  metric: "ftp" | "threshold_pace" | "css" | "lthr" | "max_hr",
  value: number
) {
  switch (metric) {
    case "ftp":
      return `${Math.round(value)} W`
    case "threshold_pace":
      return `${formatPace(value)} /km`
    case "css":
      return `${formatPace(value)} /100m`
    case "lthr":
    case "max_hr":
      return `${Math.round(value)} bpm`
  }
}

export function formatZoneBound(
  metric: "ftp" | "threshold_pace" | "css" | "lthr" | "max_hr",
  value: number | null
) {
  if (value === null) return "—"
  return formatMetricValue(metric, value)
}

export const sourceLabels: Record<string, string> = {
  manual: "Manual",
  test: "Teste",
  data_estimate: "Estimativa (histórico)",
  ai_estimate: "Estimativa (IA)",
}
