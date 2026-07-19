"use client"

import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import type { ActivityStreamsRow } from "@/lib/db/activities"

interface StreamChartsProps {
  streams: ActivityStreamsRow
}

type ChannelKey = keyof ActivityStreamsRow["data"]

const CHANNELS: Array<{ key: ChannelKey; label: string; color: string }> = [
  { key: "hr", label: "Frequência cardíaca (bpm)", color: "var(--color-chart-1)" },
  { key: "watts", label: "Potência (W)", color: "var(--color-chart-2)" },
  { key: "pace", label: "Velocidade (m/s)", color: "var(--color-chart-3)" },
  { key: "cad", label: "Cadência", color: "var(--color-chart-4)" },
  { key: "alt", label: "Altitude (m)", color: "var(--color-chart-5)" },
]

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

interface StreamPoint {
  t: number
  value: number
}

// ChartTooltipContent (shadcn) resolve o label via lookup no ChartConfig, não
// pelo valor bruto do eixo — recebia a string do label do canal em vez do
// tempo decorrido, virando "NaN:NaN". Tooltip próprio lê o ponto original.
function ElapsedTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: StreamPoint }>
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-none border bg-popover px-2 py-1 text-xs shadow-md">
      <p className="font-medium">{formatElapsed(payload[0].payload.t)}</p>
      <p className="text-muted-foreground">
        {Math.round(payload[0].value * 10) / 10}
      </p>
    </div>
  )
}

/** Um gráfico por canal presente na stream — canais ausentes são omitidos, nunca quebram. */
export function StreamCharts({ streams }: StreamChartsProps) {
  const { t } = streams.data

  const availableChannels = CHANNELS.filter(
    (channel) => (streams.data[channel.key]?.length ?? 0) > 0
  )

  if (availableChannels.length === 0) return null

  return (
    <div className="flex flex-col gap-6">
      {availableChannels.map((channel) => {
        const values = streams.data[channel.key] as number[]
        const data = t.map((time, index) => ({ t: time, value: values[index] }))
        const config: ChartConfig = {
          value: { label: channel.label, color: channel.color },
        }

        return (
          <div key={channel.key} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{channel.label}</h3>
            <ChartContainer config={config} className="aspect-auto h-40 w-full">
              <LineChart data={data}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="t"
                  tickFormatter={formatElapsed}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                />
                <ChartTooltip content={<ElapsedTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
          </div>
        )
      })}
    </div>
  )
}
