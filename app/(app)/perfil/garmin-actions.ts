"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/db/server"
import { GarminLoginError, loginToGarmin } from "@/lib/garmin/auth"
import { encrypt } from "@/lib/garmin/crypto"

export interface FormState {
  error?: string
}

const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail ou usuário do Garmin."),
  password: z.string().min(1, "Informe sua senha do Garmin."),
})

export async function connectGarmin(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = credentialsSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims) {
    return { error: "Sessão expirada, faça login novamente." }
  }

  // A senha só existe nesta variável local, usada uma vez abaixo e descartada
  // (nunca logada, nunca persistida — rule 5 do CLAUDE.md).
  let tokens
  try {
    tokens = await loginToGarmin(parsed.data.username, parsed.data.password)
  } catch (error) {
    const message =
      error instanceof GarminLoginError
        ? error.message
        : "Não foi possível conectar ao Garmin agora."

    await supabase.from("garmin_connections").upsert(
      { user_id: claims.sub, status: "error", last_error: message },
      { onConflict: "user_id" }
    )

    revalidatePath("/perfil")
    return { error: message }
  }

  const encryptedTokens = encrypt(JSON.stringify(tokens))

  // O OAuth1 dura ~1 ano (a lib não expõe uma data exata) — estimativa
  // conservadora só para avisar o usuário antes de precisar logar de novo.
  const tokenExpiresAt = new Date()
  tokenExpiresAt.setFullYear(tokenExpiresAt.getFullYear() + 1)

  const { error } = await supabase.from("garmin_connections").upsert(
    {
      user_id: claims.sub,
      oauth_tokens: encryptedTokens,
      token_expires_at: tokenExpiresAt.toISOString(),
      status: "active",
      last_error: null,
    },
    { onConflict: "user_id" }
  )

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/perfil")
  return {}
}

export async function disconnectGarmin(): Promise<FormState> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims) {
    return { error: "Sessão expirada, faça login novamente." }
  }

  const { error } = await supabase
    .from("garmin_connections")
    .update({
      oauth_tokens: null,
      token_expires_at: null,
      status: "disconnected",
      last_error: null,
    })
    .eq("user_id", claims.sub)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/perfil")
  return {}
}
