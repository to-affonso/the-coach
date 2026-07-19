"use client"

import { useRouter } from "next/navigation"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import { createClient } from "@/lib/db/client"

type ConnectionStatus = "active" | "expired" | "error" | "disconnected"

interface SyncStatusValue {
  /** null enquanto a primeira leitura da conexão ainda não voltou. */
  connectionStatus: ConnectionStatus | null
  lastSyncAt: string | null
  lastError: string | null
  syncing: boolean
  syncNow: () => void
}

const SyncStatusContext = createContext<SyncStatusValue | null>(null)

// Spec (princípios globais > "Sync automático ao abrir"): protege a
// integração não-oficial do Garmin contra chamadas em excesso.
const THROTTLE_MS = 10 * 60 * 1000

interface ConnectionRow {
  status: ConnectionStatus
  last_error: string | null
  last_sync_at: string | null
}

export function SyncStatusProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  // Trava em memória contra chamadas sobrepostas (ex.: focus e visibilitychange
  // disparando quase juntos) — o throttle real vem de last_sync_at no banco.
  const syncingRef = useRef(false)

  const refreshConnection = useCallback(async (): Promise<
    ConnectionRow | null
  > => {
    const supabase = createClient()
    const { data } = await supabase
      .from("garmin_connections")
      .select("status, last_error, last_sync_at")
      .maybeSingle()

    const row = (data as ConnectionRow | null) ?? null
    setConnectionStatus(row?.status ?? "disconnected")
    setLastError(row?.last_error ?? null)
    setLastSyncAt(row?.last_sync_at ?? null)
    return row
  }, [])

  const runSync = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)

    try {
      const response = await fetch("/api/garmin/sync", { method: "POST" })
      const result = await response.json().catch(() => null)
      await refreshConnection()

      if (response.ok && result?.inserted > 0) {
        router.refresh()
      }
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [refreshConnection, router])

  useEffect(() => {
    let cancelled = false

    async function maybeAutoSync() {
      const row = await refreshConnection()
      if (cancelled || !row || row.status === "disconnected") return

      const lastSyncMs = row.last_sync_at
        ? new Date(row.last_sync_at).getTime()
        : 0
      const dueForSync = Date.now() - lastSyncMs > THROTTLE_MS
      if (dueForSync) void runSync()
    }

    void maybeAutoSync()

    function onFocusOrVisible() {
      if (document.visibilityState === "visible") void maybeAutoSync()
    }

    document.addEventListener("visibilitychange", onFocusOrVisible)
    window.addEventListener("focus", onFocusOrVisible)

    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onFocusOrVisible)
      window.removeEventListener("focus", onFocusOrVisible)
    }
  }, [refreshConnection, runSync])

  return (
    <SyncStatusContext.Provider
      value={{
        connectionStatus,
        lastSyncAt,
        lastError,
        syncing,
        syncNow: () => void runSync(),
      }}
    >
      {children}
    </SyncStatusContext.Provider>
  )
}

export function useSyncStatus() {
  const context = useContext(SyncStatusContext)
  if (!context) {
    throw new Error("useSyncStatus precisa estar dentro de SyncStatusProvider")
  }
  return context
}
