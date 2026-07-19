"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/db/server"

const timezones = new Set(Intl.supportedValuesOf("timeZone"))

const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório.")
    .max(120, "Nome muito longo."),
  birth_date: z.iso.date("Data de nascimento inválida."),
  sex: z.enum(["male", "female", "other"], "Selecione o sexo."),
  weight_kg: z.coerce
    .number("Peso deve ser um número.")
    .positive("Peso deve ser maior que zero.")
    .max(300, "Peso deve ser no máximo 300 kg."),
  timezone: z
    .string()
    .refine((tz) => timezones.has(tz), "Selecione um fuso horário válido."),
})

export interface FormState {
  error?: string
}

export async function updateProfile(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name"),
    birth_date: formData.get("birth_date"),
    sex: formData.get("sex"),
    weight_kg: formData.get("weight_kg"),
    timezone: formData.get("timezone"),
  })

  if (!parsed.success) {
    return { error: "Confira os campos: " + parsed.error.issues[0]?.message }
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims) {
    return { error: "Sessão expirada, faça login novamente." }
  }

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", claims.sub)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/perfil")
  return {}
}

const thresholdSchema = z.object({
  sport: z.enum(["swim", "bike", "run"], "Esporte inválido."),
  metric: z.enum(
    ["ftp", "threshold_pace", "css", "lthr", "max_hr"],
    "Métrica inválida."
  ),
  value: z.coerce
    .number("Valor deve ser um número.")
    .positive("Valor deve ser maior que zero."),
  effective_from: z.iso.date("Data inválida."),
  source: z.enum(
    ["manual", "test", "data_estimate", "ai_estimate"],
    "Selecione a origem."
  ),
})

export async function addThreshold(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = thresholdSchema.safeParse({
    sport: formData.get("sport"),
    metric: formData.get("metric"),
    value: formData.get("value"),
    effective_from: formData.get("effective_from"),
    source: formData.get("source"),
  })

  if (!parsed.success) {
    return { error: "Confira os campos: " + parsed.error.issues[0]?.message }
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims) {
    return { error: "Sessão expirada, faça login novamente." }
  }

  // Nunca edita: sempre um INSERT novo (histórico preservado — regra do modelo de dados).
  const { error } = await supabase
    .from("athlete_thresholds")
    .insert({ ...parsed.data, user_id: claims.sub })

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Já existe um registro para este esporte/métrica/data."
          : error.message,
    }
  }

  revalidatePath("/perfil")
  return {}
}
