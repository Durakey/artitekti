"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";

import { updatePassword, type AuthState } from "@/app/(auth)/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

const initialState: AuthState = {};

export default function UpdatePasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, initialState);
  return <AuthShell description="Choose a strong, unique password for your private workspace." eyebrow="Secure your account" title="Set a new password.">
    <form action={action} className="space-y-5">
      <label className="grid gap-2 text-sm font-medium text-zinc-200"><span>New password</span><input required autoComplete="new-password" minLength={12} className="h-11 rounded-xl border bg-card px-3 text-sm outline-none transition-colors focus:border-[#d6c3a6] focus:ring-2 focus:ring-[#d6c3a6]/15" name="password" type="password" /></label>
      <label className="grid gap-2 text-sm font-medium text-zinc-200"><span>Confirm password</span><input required autoComplete="new-password" minLength={12} className="h-11 rounded-xl border bg-card px-3 text-sm outline-none transition-colors focus:border-[#d6c3a6] focus:ring-2 focus:ring-[#d6c3a6]/15" name="confirmation" type="password" /></label>
      {state.error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">{state.error}</p>}
      <Button className="w-full" disabled={pending} size="lg" type="submit">{pending && <LoaderCircle className="size-4 animate-spin" />}Update password</Button>
    </form>
  </AuthShell>;
}
