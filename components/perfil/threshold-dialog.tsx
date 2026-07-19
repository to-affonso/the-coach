"use client"

import { useActionState, useState } from "react"

import { addThreshold, type FormState } from "@/app/(app)/perfil/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const initialState: FormState = {}

interface ThresholdDialogProps {
  sport: "swim" | "bike" | "run"
  metric: "ftp" | "threshold_pace" | "css" | "lthr" | "max_hr"
  metricLabel: string
  unitHint: string
  hasExisting: boolean
}

export function ThresholdDialog({
  sport,
  metric,
  metricLabel,
  unitHint,
  hasExisting,
}: ThresholdDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    async (_prevState: FormState, formData: FormData) => {
      const result = await addThreshold(_prevState, formData)
      if (!result.error) {
        setOpen(false)
      }
      return result
    },
    initialState
  )

  const today = new Date().toISOString().slice(0, 10)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {hasExisting ? "Atualizar" : "Definir"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <input type="hidden" name="sport" value={sport} />
          <input type="hidden" name="metric" value={metric} />
          <DialogHeader>
            <DialogTitle>Atualizar {metricLabel}</DialogTitle>
            <DialogDescription>
              O histórico anterior permanece — seus treinos passados não são
              recalculados.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {state.error ? (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor={`value-${sport}-${metric}`}>
                Novo valor ({unitHint})
              </Label>
              <Input
                id={`value-${sport}-${metric}`}
                name="value"
                type="number"
                step="any"
                min="0"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`date-${sport}-${metric}`}>
                Válido a partir de
              </Label>
              <Input
                id={`date-${sport}-${metric}`}
                name="effective_from"
                type="date"
                defaultValue={today}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`source-${sport}-${metric}`}>Origem</Label>
              <Select name="source" defaultValue="manual" required>
                <SelectTrigger id={`source-${sport}-${metric}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (autorrelato)</SelectItem>
                  <SelectItem value="test">Teste formal</SelectItem>
                  <SelectItem value="data_estimate">
                    Estimativa (histórico)
                  </SelectItem>
                  <SelectItem value="ai_estimate">Estimativa (IA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
