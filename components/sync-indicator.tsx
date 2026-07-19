"use client"

import Link from "next/link"
import {
  ArrowsClockwiseIcon,
  CloudCheckIcon,
  CloudSlashIcon,
  CloudWarningIcon,
} from "@phosphor-icons/react/dist/ssr"

import { useSyncStatus } from "@/components/sync-status-provider"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

const STATE_CONFIG = {
  disconnected: {
    icon: CloudSlashIcon,
    label: "Não conectado",
    className: "text-muted-foreground",
  },
  ok: {
    icon: CloudCheckIcon,
    label: "Sincronizado",
    className: "text-muted-foreground",
  },
  // erro/expirado (spec: "destaque de atenção, tap → Perfil > Conexão")
  error: {
    icon: CloudWarningIcon,
    label: "Erro na conexão",
    className: "text-destructive",
  },
} as const

export function SyncIndicator() {
  const { connectionStatus, lastSyncAt, lastError, syncing, syncNow } =
    useSyncStatus()

  const stateKey =
    connectionStatus === "error" || connectionStatus === "expired"
      ? "error"
      : connectionStatus === "active"
        ? "ok"
        : "disconnected"

  const { icon: Icon, label, className } = STATE_CONFIG[stateKey]

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1.5 text-xs ${className} cursor-pointer`}
        >
          {syncing ? (
            <ArrowsClockwiseIcon className="size-4 animate-spin" />
          ) : (
            <Icon className="size-4" />
          )}
          <span className="hidden sm:inline">
            {syncing ? "Sincronizando…" : label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end">
        <PopoverHeader>
          <PopoverTitle>{syncing ? "Sincronizando…" : label}</PopoverTitle>
          {lastSyncAt ? (
            <PopoverDescription>
              Último sync: {new Date(lastSyncAt).toLocaleString("pt-BR")}
            </PopoverDescription>
          ) : null}
          {stateKey === "error" && lastError ? (
            <PopoverDescription className="text-destructive">
              {lastError}
            </PopoverDescription>
          ) : null}
        </PopoverHeader>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={syncing || stateKey === "disconnected"}
            onClick={syncNow}
          >
            Sincronizar agora
          </Button>
          {stateKey !== "ok" ? (
            <Button size="sm" variant="ghost" asChild>
              <Link href="/perfil">Ver conexão</Link>
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
