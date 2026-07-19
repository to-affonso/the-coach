import { toLocalDateString } from "@/lib/metrics/daily-tss"

export function formatDuration(totalSeconds: number | null | undefined): string {
  if (!totalSeconds) return "—"
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.round((totalSeconds % 3600) / 60)
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`
  return `${minutes}min`
}

export function formatDistanceKm(meters: number | null | undefined): string {
  if (!meters) return "—"
  return `${(meters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`
}

/** unitMeters: 1000 para pace de corrida (min/km), 100 para natação (min/100m). */
export function formatPace(
  speedMps: number | null | undefined,
  unitMeters: number
): string {
  if (!speedMps || speedMps <= 0) return "—"
  const secPerUnit = unitMeters / speedMps
  const minutes = Math.floor(secPerUnit / 60)
  const seconds = Math.round(secPerUnit % 60)
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function formatWatts(watts: number | null | undefined): string {
  if (!watts) return "—"
  return `${Math.round(watts)} W`
}

export function formatHr(bpm: number | null | undefined): string {
  if (!bpm) return "—"
  return `${Math.round(bpm)} bpm`
}

export function formatTss(tss: number | null | undefined): string {
  if (tss === null || tss === undefined) return "—"
  return `${Math.round(tss)} TSS`
}

/** Hora local (HH:mm) no timezone do perfil, não no do servidor/browser. */
export function formatTimeOfDay(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(iso))
}

const WEEKDAY_DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
})

/**
 * "Hoje" / "Ontem" / "Ter, 14 jul" — a virada do dia é a do timezone do
 * perfil (convenção do projeto: UTC no banco, timezone só na borda), nunca a
 * do servidor/browser.
 */
export function formatDayLabel(startTimeIso: string, timezone: string): string {
  const localDate = toLocalDateString(startTimeIso, timezone)
  const todayLocal = toLocalDateString(new Date().toISOString(), timezone)

  const yesterday = new Date()
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayLocal = toLocalDateString(yesterday.toISOString(), timezone)

  if (localDate === todayLocal) return "Hoje"
  if (localDate === yesterdayLocal) return "Ontem"

  // Formata a partir dos componentes Y-M-D do dia local, ao meio-dia UTC —
  // evita que o Intl (sem timeZone explícito) escorregue pro dia adjacente.
  const [year, month, day] = localDate.split("-").map(Number)
  return WEEKDAY_DATE_FORMATTER.format(new Date(Date.UTC(year, month - 1, day, 12)))
}
