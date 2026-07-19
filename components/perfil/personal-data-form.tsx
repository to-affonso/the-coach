"use client"

import { useActionState } from "react"

import { updateProfile, type FormState } from "@/app/(app)/perfil/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TimezoneCombobox } from "@/components/perfil/timezone-combobox"

interface Profile {
  display_name: string | null
  birth_date: string | null
  sex: string | null
  weight_kg: number | null
  timezone: string | null
}

const initialState: FormState = {}

export function PersonalDataForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState
  )

  return (
    // key força remount após salvar: evita que o reset nativo do form (disparado
    // pelo React após uma Server Action bem-sucedida) deixe o Select/combobox
    // mostrando o placeholder em vez do valor recém-salvo.
    <form
      key={JSON.stringify(profile)}
      action={formAction}
      className="flex flex-col gap-4"
    >
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="display_name">Nome</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={profile.display_name ?? ""}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="birth_date">Data de nascimento</Label>
        <Input
          id="birth_date"
          name="birth_date"
          type="date"
          defaultValue={profile.birth_date ?? ""}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sex">Sexo</Label>
        <Select name="sex" defaultValue={profile.sex ?? undefined} required>
          <SelectTrigger id="sex" className="w-full">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Masculino</SelectItem>
            <SelectItem value="female">Feminino</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="weight_kg">Peso (kg)</Label>
        <Input
          id="weight_kg"
          name="weight_kg"
          type="number"
          step="0.1"
          min="0"
          defaultValue={profile.weight_kg ?? ""}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">Fuso horário</Label>
        <TimezoneCombobox defaultValue={profile.timezone} />
      </div>

      <Button type="submit" disabled={pending} className="mt-2 self-start">
        {pending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  )
}
