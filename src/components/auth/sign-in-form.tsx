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
    <form action={action} className="space-y-6">
      <Field label="Email address" name="email" type="email" autoComplete="email" />
      <Field label="Password" name="password" type="password" autoComplete="current-password" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
          <input name="remember-me" type="checkbox" className="h-4 w-4 rounded border-slate-300 bg-white text-[#d6c3a6] accent-[#d6c3a6] shadow-sm focus:ring-2 focus:ring-[#d6c3a6]/30" />
          Remember me
        </label>
        <Link className="text-sm font-medium text-[#b08d5a] transition-colors hover:text-[#8b6f4b]" href="/forgot-password">Forgot password?</Link>
      </div>
      {state.error && <p className="rounded-2xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      <Button className="w-full rounded-2xl bg-[#d6c3a6] px-4 py-3 text-sm font-semibold text-black shadow-sm transition hover:bg-[#c4ad83] disabled:bg-[#f2e8d8] disabled:text-slate-500" disabled={pending} size="lg" type="submit">
        {pending && <LoaderCircle className="size-4 animate-spin" />}Sign in securely
      </Button>
    </form>
  );
}

function Field({ label, name, type, autoComplete }: { label: string; name: string; type: string; autoComplete: string }) {
  return (
    <label className="grid gap-3 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <input
        required
        autoComplete={autoComplete}
        className="h-12 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#d6c3a6] focus:ring-2 focus:ring-[#d6c3a6]/20 placeholder:text-slate-400"
        name={name}
        type={type}
      />
    </label>
  );
}
