"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { ActivityCard } from "@/components/feed/activity-card"
import { useSyncStatus } from "@/components/sync-status-provider"
import { Skeleton } from "@/components/ui/skeleton"
import type { ActivityFeedItem } from "@/lib/db/activities"
import { formatDayLabel } from "@/lib/format"
import { toLocalDateString } from "@/lib/metrics/daily-tss"

interface FeedListProps {
  initialActivities: ActivityFeedItem[]
  initialCursor: string | null
  timezone: string
}

interface DayGroup {
  key: string
  label: string
  items: ActivityFeedItem[]
}

function groupByDay(
  activities: ActivityFeedItem[],
  timezone: string
): DayGroup[] {
  const groups: DayGroup[] = []

  for (const activity of activities) {
    const key = toLocalDateString(activity.start_time, timezone)
    const lastGroup = groups[groups.length - 1]

    if (lastGroup && lastGroup.key === key) {
      lastGroup.items.push(activity)
    } else {
      groups.push({
        key,
        label: formatDayLabel(activity.start_time, timezone),
        items: [activity],
      })
    }
  }

  return groups
}

export function FeedList({
  initialActivities,
  initialCursor,
  timezone,
}: FeedListProps) {
  const [activities, setActivities] = useState(initialActivities)
  const [cursor, setCursor] = useState(initialCursor)
  const [loadingMore, setLoadingMore] = useState(false)
  const { syncing } = useSyncStatus()
  const hasLoadedMore = useRef(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Um sync em background que termina enquanto o usuário ainda está na
  // primeira página reflete no Feed sem recarregar a tela (spec 2.6). Se o
  // usuário já rolou pra mais páginas, não descarta o progresso do scroll.
  useEffect(() => {
    if (hasLoadedMore.current) return
    setActivities(initialActivities)
    setCursor(initialCursor)
  }, [initialActivities, initialCursor])

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return
    hasLoadedMore.current = true
    setLoadingMore(true)
    try {
      const response = await fetch(
        `/api/activities?cursor=${encodeURIComponent(cursor)}`
      )
      const page: { activities: ActivityFeedItem[]; nextCursor: string | null } =
        await response.json()
      setActivities((prev) => [...prev, ...page.activities])
      setCursor(page.nextCursor)
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, loadingMore])

  useEffect(() => {
    const element = sentinelRef.current
    if (!element || !cursor) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore()
      },
      { rootMargin: "400px" }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [loadMore, cursor])

  const groups = useMemo(
    () => groupByDay(activities, timezone),
    [activities, timezone]
  )

  return (
    <div className="flex flex-col">
      {syncing ? (
        <div className="flex flex-col gap-2 border-b p-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : null}

      {groups.map((group) => (
        <div key={group.key}>
          <div className="sticky top-14 z-10 border-b bg-background/95 px-4 py-2 text-sm font-medium backdrop-blur-sm">
            {group.label}
          </div>
          {group.items.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              timezone={timezone}
            />
          ))}
        </div>
      ))}

      {cursor ? (
        <div ref={sentinelRef} className="flex flex-col gap-2 p-4">
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Fim do histórico de treinos.
        </p>
      )}
    </div>
  )
}
