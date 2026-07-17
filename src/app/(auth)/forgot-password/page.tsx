"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";

import { requestPasswordReset, type AuthState } from "@/app/(auth)/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

const initialState: AuthState = {};

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);
  return <AuthShell description="Enter the email for your private workspace and we’ll send a secure reset link." eyebrow="Account recovery" title="Reset your password.">
    <form action={action} className="space-y-5">
      <label className="grid gap-2 text-sm font-medium text-zinc-200"><span>Email address</span><input required autoComplete="email" className="h-11 rounded-xl border bg-card px-3 text-sm outline-none transition-colors focus:border-[#d6c3a6] focus:ring-2 focus:ring-[#d6c3a6]/15" name="email" type="email" /></label>
      {state.error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">{state.error}</p>}
      {state.success && <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-100">{state.success}</p>}
      <Button className="w-full" disabled={pending} size="lg" type="submit">{pending && <LoaderCircle className="size-4 animate-spin" />}Send reset link</Button>
      <Link className="flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-white" href="/sign-in"><ArrowLeft className="size-4" />Back to sign in</Link>
    </form>
  </AuthShell>;
}
