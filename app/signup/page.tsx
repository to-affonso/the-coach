import Link from "next/link"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { signup } from "./actions"

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>Comece a planejar seus treinos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Não foi possível criar a conta</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={6}
                required
              />
            </div>
            <Button formAction={signup} type="submit" className="mt-2">
              Cadastrar
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
