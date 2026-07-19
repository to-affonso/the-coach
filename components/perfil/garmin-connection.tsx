"use client"

import { useActionState, useState } from "react"

import {
  connectGarmin,
  disconnectGarmin,
  type FormState,
} from "@/app/(app)/perfil/garmin-actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type GarminStatus = "active" | "expired" | "error" | "disconnected"

interface GarminConnectionProps {
  connection: {
    status: GarminStatus
    last_error: string | null
    last_sync_at: string | null
  } | null
}

const STATUS_LABELS: Record<GarminStatus, string> = {
  active: "Conectada",
  expired: "Expirada",
  error: "Erro",
  disconnected: "Desconectada",
}

const STATUS_VARIANTS: Record<
  GarminStatus,
  "default" | "destructive" | "secondary"
> = {
  active: "default",
  expired: "destructive",
  error: "destructive",
  disconnected: "secondary",
}

const initialState: FormState = {}

export function GarminConnection({ connection }: GarminConnectionProps) {
  const status = connection?.status ?? "disconnected"

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant={STATUS_VARIANTS[status]}>
          {STATUS_LABELS[status]}
        </Badge>
        {connection?.last_sync_at ? (
          <span className="text-sm text-muted-foreground">
            Último sync:{" "}
            {new Date(connection.last_sync_at).toLocaleString("pt-BR")}
          </span>
        ) : null}
      </div>

      {status === "error" && connection?.last_error ? (
        <Alert variant="destructive">
          <AlertDescription>{connection.last_error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex gap-2">
        {status === "active" ? (
          <DisconnectButton />
        ) : (
          <ConnectDialog
            label={status === "disconnected" ? "Conectar" : "Reconectar"}
          />
        )}
      </div>
    </div>
  )
}

function ConnectDialog({ label }: { label: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    async (prevState: FormState, formData: FormData) => {
      const result = await connectGarmin(prevState, formData)
      if (!result.error) {
        setOpen(false)
      }
      return result
    },
    initialState
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{label}</Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Conectar ao Garmin</DialogTitle>
            <DialogDescription>
              Sua senha é usada uma única vez para autenticar e nunca é
              armazenada. Guardamos apenas tokens de sessão criptografados.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {state.error ? (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="garmin-username">E-mail ou usuário Garmin</Label>
              <Input id="garmin-username" name="username" required />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="garmin-password">Senha Garmin</Label>
              <Input
                id="garmin-password"
                name="password"
                type="password"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Conectando…" : "Conectar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DisconnectButton() {
  const [pending, setPending] = useState(false)

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Desconectar</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desconectar do Garmin?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso remove os tokens de acesso. Suas atividades já importadas
            continuam disponíveis.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={async (event) => {
              event.preventDefault()
              setPending(true)
              await disconnectGarmin()
              setPending(false)
            }}
          >
            Desconectar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
