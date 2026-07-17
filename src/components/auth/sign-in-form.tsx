"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";

import { signIn, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

const initialState: AuthState = {};

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, initialState);
  return (
    <form action={action} className="space-y-5">
      <Field label="Email address" name="email" type="email" autoComplete="email" />
      <Field label="Password" name="password" type="password" autoComplete="current-password" />
      <div className="flex items-center justify-between text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-muted-foreground"><input name="remember-me" type="checkbox" className="size-4 rounded border-border bg-muted accent-[#d6c3a6]" />Remember me</label>
        <Link className="text-[#d6c3a6] transition-colors hover:text-white" href="/forgot-password">Forgot password?</Link>
      </div>
      {state.error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">{state.error}</p>}
      <Button className="w-full" disabled={pending} size="lg" type="submit">{pending && <LoaderCircle className="size-4 animate-spin" />}Sign in securely</Button>
    </form>
  );
}

function Field({ label, name, type, autoComplete }: { label: string; name: string; type: string; autoComplete: string }) {
  return <label className="grid gap-2 text-sm font-medium text-zinc-200"><span>{label}</span><input required autoComplete={autoComplete} className="h-11 rounded-xl border bg-card px-3 text-sm outline-none transition-colors placeholder:text-zinc-600 focus:border-[#d6c3a6] focus:ring-2 focus:ring-[#d6c3a6]/15" name={name} type={type} /></label>;
}
