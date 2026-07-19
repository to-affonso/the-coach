import type { Icon } from "@phosphor-icons/react"
import {
  CalendarBlankIcon,
  ChartLineUpIcon,
  HouseIcon,
  TargetIcon,
  UserCircleIcon,
} from "@phosphor-icons/react/dist/ssr"

export interface NavItem {
  href: string
  label: string
  icon: Icon
}

export const navItems: NavItem[] = [
  { href: "/", label: "Feed", icon: HouseIcon },
  { href: "/calendario", label: "Calendário", icon: CalendarBlankIcon },
  { href: "/plano", label: "Plano", icon: TargetIcon },
  { href: "/progresso", label: "Progresso", icon: ChartLineUpIcon },
  { href: "/perfil", label: "Perfil", icon: UserCircleIcon },
]
