"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { navItems } from "@/components/nav-items"
import { cn } from "@/lib/utils"

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center border-t bg-background md:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-xs",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon size={22} weight={isActive ? "fill" : "regular"} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
