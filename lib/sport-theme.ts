import type { Icon } from "@phosphor-icons/react"
import {
  BarbellIcon,
  PersonSimpleBikeIcon,
  PersonSimpleRunIcon,
  PersonSimpleSwimIcon,
  WatchIcon,
} from "@phosphor-icons/react/dist/ssr"

export type ActivitySport = "swim" | "bike" | "run" | "strength"

export interface SportTheme {
  icon: Icon
  label: string
  colorVar: string
}

/**
 * Sem tokens de cor dedicados por esporte no tema ainda — reaproveita a
 * paleta genérica de gráficos (decisão tomada no chat de planejamento,
 * 2.7/2.8; ver docs/spec-telas.md > Princípios globais).
 */
const SPORT_THEME: Record<ActivitySport, SportTheme> = {
  swim: {
    icon: PersonSimpleSwimIcon,
    label: "Natação",
    colorVar: "var(--color-chart-1)",
  },
  bike: {
    icon: PersonSimpleBikeIcon,
    label: "Bike",
    colorVar: "var(--color-chart-2)",
  },
  run: {
    icon: PersonSimpleRunIcon,
    label: "Corrida",
    colorVar: "var(--color-chart-3)",
  },
  strength: {
    icon: BarbellIcon,
    label: "Força",
    colorVar: "var(--color-chart-4)",
  },
}

const FALLBACK_THEME: SportTheme = {
  icon: WatchIcon,
  label: "Treino",
  colorVar: "var(--color-muted-foreground)",
}

// `activities.sport` também aceita 'brick'/'rest' no banco (enum compartilhado
// com planned_workouts), mas nenhum dos dois chega como atividade sincronizada
// na prática — fallback é só defensivo.
export function getSportTheme(sport: string): SportTheme {
  return SPORT_THEME[sport as ActivitySport] ?? FALLBACK_THEME
}
