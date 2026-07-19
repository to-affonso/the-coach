/** Garmin retorna "YYYY-MM-DD HH:mm:ss" sem timezone (é sempre GMT/UTC). */
export function toIsoUtc(garminTimestamp: string): string {
  return new Date(`${garminTimestamp.replace(" ", "T")}Z`).toISOString()
}
