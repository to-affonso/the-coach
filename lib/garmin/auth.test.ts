import { describe, expect, it } from "vitest"

import { translateGarminError } from "@/lib/garmin/auth"

describe("translateGarminError", () => {
  it("reconhece conta bloqueada", () => {
    const error = new Error("登录失败（账户已锁定），请打开Connect网页解锁您的账户")
    expect(translateGarminError(error).reason).toBe("account_locked")
  })

  it("reconhece MFA exigido (mensagem específica, não a genérica que também cita MFA)", () => {
    const error = new Error("需要MFA验证，但未提供验证码获取方式")
    expect(translateGarminError(error).reason).toBe("mfa_required")
  })

  it("reconhece senha/usuário inválidos, mesmo quando a mensagem também menciona MFA de passagem", () => {
    const error = new Error(
      "登录失败（未找到票据或MFA验证失败），请检查用户名和密码"
    )
    expect(translateGarminError(error).reason).toBe("invalid_credentials")
  })

  it("reconhece rate limit (HTTP 429)", () => {
    const error = new Error("HTTP Error (429): Too Many Requests")
    expect(translateGarminError(error).reason).toBe("rate_limited")
  })

  it("cai no fallback genérico para erros desconhecidos", () => {
    const error = new Error("algo completamente inesperado")
    expect(translateGarminError(error).reason).toBe("unknown")
  })

  it("cai no fallback genérico quando o valor lançado não é um Error", () => {
    expect(translateGarminError("string crua").reason).toBe("unknown")
  })
})
