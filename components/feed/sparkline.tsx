"use client"

import { useEffect, useState } from "react"

import { useInView } from "@/hooks/use-in-view"
import { createClient } from "@/lib/db/client"

interface SparklineProps {
  activityId: string
  sport: string
}

// Série principal por esporte (spec: "potência na bike, pace na corrida,
// pace na natação"); força não tem sparkline. Note: o canal "pace" guarda
// velocidade em m/s (decisão em modelo-de-dados.md), não pace em si — para
// um sparkline sem eixos a forma da curva é o que importa, não o sinal.
const PRIMARY_CHANNEL: Partial<Record<string, "watts" | "pace">> = {
  bike: "watts",
  run: "pace",
  swim: "pace",
}

/** Renderizado sob demanda (viewport), como o visual da atividade (spec Feed). */
export function Sparkline({ activityId, sport }: SparklineProps) {
  const { ref, inView } = useInView<HTMLDivElement>()
  const [values, setValues] = useState<number[] | null>(null)
  const channel = PRIMARY_CHANNEL[sport]

  useEffect(() => {
    if (!inView || !channel) return

    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from("activity_streams")
        .select("data")
        .eq("activity_id", activityId)
        .maybeSingle()

      if (cancelled) return
      const streamData = data?.data as Record<string, number[]> | undefined
      const series = channel ? streamData?.[channel] : undefined
      setValues(series && series.length > 1 ? series : [])
    }
    void load()

    return () => {
      cancelled = true
    }
  }, [inView, channel, activityId])

  if (!channel) return null

  return (
    <div ref={ref} className="h-10 w-full">
      {values && values.length > 1 ? <SparklineSvg values={values} /> : null}
    </div>
  )
}

function SparklineSvg({ values }: { values: number[] }) {
  const width = 200
  const height = 40
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values
    .map((value, i) => {
      const x = (i / (values.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full text-muted-foreground"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
