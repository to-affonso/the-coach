import { GarminConnect } from "@gooin/garmin-connect"

export interface GarminOauth1Token {
  oauth_token: string
  oauth_token_secret: string
}

export interface GarminOauth2Token {
  scope: string
  jti: string
  access_token: string
  token_type: string
  refresh_token: string
  expires_in: number
  refresh_token_expires_in: number
  expires_at: number
  refresh_token_expires_at: number
  last_update_date: string
  expires_date: string
}

export interface GarminTokens {
  oauth1: GarminOauth1Token
  oauth2: GarminOauth2Token
}

export type GarminLoginErrorReason =
  | "invalid_credentials"
  | "account_locked"
  | "mfa_required"
  | "rate_limited"
  | "unknown"

const ERROR_MESSAGES: Record<GarminLoginErrorReason, string> = {
  invalid_credentials: "E-mail ou senha do Garmin incorretos.",
  account_locked:
    "Sua conta Garmin está bloqueada. Acesse o site do Garmin Connect para desbloqueá-la e tente de novo.",
  mfa_required:
    "Sua conta Garmin tem autenticação em duas etapas ativada, ainda não suportada aqui. Desative-a temporariamente no Garmin Connect ou use outra conta.",
  rate_limited:
    "O Garmin recusou a conexão por excesso de tentativas. Aguarde alguns minutos e tente de novo.",
  unknown: "Não foi possível conectar ao Garmin agora. Tente novamente em alguns minutos.",
}

export class GarminLoginError extends Error {
  reason: GarminLoginErrorReason

  constructor(reason: GarminLoginErrorReason) {
    super(ERROR_MESSAGES[reason])
    this.reason = reason
  }
}

/**
 * @gooin/garmin-connect não tem classes de erro tipadas — só `Error` genérico
 * com mensagem em chinês. Reconhecemos os cenários pelas strings específicas
 * (mais específica primeiro, para não confundir a mensagem de "MFA exigido"
 * com a mensagem genérica de ticket-não-encontrado que também menciona MFA
 * de passagem). Se a lib mudar o texto numa versão futura, cai no fallback
 * genérico em vez de quebrar.
 */
export function translateGarminError(error: unknown): GarminLoginError {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("账户已锁定")) {
    return new GarminLoginError("account_locked")
  }
  if (message.includes("需要MFA验证")) {
    return new GarminLoginError("mfa_required")
  }
  if (message.includes("密码错误") || message.includes("请检查用户名和密码")) {
    return new GarminLoginError("invalid_credentials")
  }
  if (/HTTP Error \(429\)/.test(message)) {
    return new GarminLoginError("rate_limited")
  }
  return new GarminLoginError("unknown")
}

/** Login único: a senha é usada aqui e descartada — nunca persistida (rule 5). */
export async function loginToGarmin(
  username: string,
  password: string
): Promise<GarminTokens> {
  const client = new GarminConnect({ username, password })

  try {
    await client.login()
  } catch (error) {
    throw translateGarminError(error)
  }

  return client.exportToken()
}

/**
 * Restaura uma sessão a partir de tokens já salvos (sync, sem senha). O
 * construtor exige username/password truthy mesmo quando só vamos usar
 * loadToken — nunca são transmitidos nesse caminho, só checados.
 */
export function restoreGarminSession(tokens: GarminTokens): GarminConnect {
  const client = new GarminConnect({
    username: "restored-session",
    password: "restored-session",
  })
  client.loadToken(tokens.oauth1, tokens.oauth2)
  return client
}
