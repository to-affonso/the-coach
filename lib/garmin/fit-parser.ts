import FitParser from "fit-file-parser"
import { z } from "zod"

// Só os campos que o app realmente consome — o resto do que a lib expõe
// (dezenas de campos por mensagem) é ignorado. Tudo opcional: um FIT real
// varia muito conforme o dispositivo (indoor sem GPS, sem potência, etc.).
const recordSchema = z.object({
  timestamp: z.coerce.date(),
  heart_rate: z.number().optional(),
  power: z.number().optional(),
  speed: z.number().optional(),
  cadence: z.number().optional(),
  altitude: z.number().optional(),
  distance: z.number().optional(),
  // A lib já converte semicircles -> graus (base_type sint32 no perfil FIT
  // aplica o fator de conversão automaticamente em qualquer campo desse tipo).
  position_lat: z.number().optional(),
  position_long: z.number().optional(),
})

const sessionSchema = z.object({
  total_elapsed_time: z.number().optional(),
  total_timer_time: z.number().optional(),
  total_distance: z.number().optional(),
  total_ascent: z.number().optional(),
  avg_heart_rate: z.number().optional(),
  max_heart_rate: z.number().optional(),
  avg_power: z.number().optional(),
  max_power: z.number().optional(),
  avg_cadence: z.number().optional(),
  avg_speed: z.number().optional(),
  total_calories: z.number().optional(),
  avg_stroke_count: z.number().optional(),
  pool_length: z.number().optional(),
  left_right_balance: z.number().optional(),
  total_training_effect: z.number().optional(),
  swim_stroke: z.string().optional(),
})

const lapSchema = z.object({
  start_time: z.coerce.date(),
  total_elapsed_time: z.number().optional(),
  total_distance: z.number().optional(),
  avg_heart_rate: z.number().optional(),
  max_heart_rate: z.number().optional(),
  avg_power: z.number().optional(),
  avg_speed: z.number().optional(),
})

const parsedFitSchema = z.object({
  records: z.array(recordSchema).default([]),
  sessions: z.array(sessionSchema).default([]),
  laps: z.array(lapSchema).default([]),
})

export type FitRecord = z.infer<typeof recordSchema>
export type FitSession = z.infer<typeof sessionSchema>
export type FitLap = z.infer<typeof lapSchema>
export type ParsedFitFile = z.infer<typeof parsedFitSchema>

export async function parseFitFile(buffer: Buffer): Promise<ParsedFitFile> {
  const parser = new FitParser({
    force: true, // arquivos reais de Garmin têm pequenos desvios da spec
    mode: "list",
    speedUnit: "m/s",
    lengthUnit: "m",
    temperatureUnit: "celsius",
    elapsedRecordField: true,
  })

  // Buffer.buffer pode ser maior que o próprio buffer (pooling do Node) — o
  // slice garante um ArrayBuffer exato, e não um Buffer<ArrayBufferLike>
  // genérico, que o tipo da lib não aceita.
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer

  const raw = await parser.parseAsync(arrayBuffer)

  // Entrada externa (arquivo baixado de terceiro) sempre passa por Zod.
  return parsedFitSchema.parse(raw)
}
