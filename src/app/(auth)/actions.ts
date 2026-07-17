"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createActionClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; success?: string };

function emailFrom(formData: FormData) {
  const email = formData.get("email");
  return typeof email === "string" ? email.trim() : "";
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = emailFrom(formData);
  const password = formData.get("password");
  const rememberMe = formData.get("remember-me") === "on";

  if (!email || typeof password !== "string") return { error: "Enter your email address and password." };

  try {
    const supabase = await createActionClient(rememberMe);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "We couldn’t sign you in with those credentials." };
  } catch {
    return { error: "The secure connection is not configured yet. Add the Supabase keys to .env.local." };
  }

  redirect("/");
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = emailFrom(formData);
  if (!email) return { error: "Enter the email address associated with your workspace." };

  try {
    const origin = (await headers()).get("origin");
    const supabase = await createActionClient(false);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/update-password`,
    });
    if (error) return { error: "We couldn’t send a reset link. Please try again." };
  } catch {
    return { error: "The secure connection is not configured yet. Add the Supabase keys to .env.local." };
  }

  return { success: "If that address is registered, a password-reset link is on its way." };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = formData.get("password");
  const confirmation = formData.get("confirmation");
  if (typeof password !== "string" || password.length < 12) return { error: "Use a password with at least 12 characters." };
  if (password !== confirmation) return { error: "The passwords don’t match." };

  try {
    const supabase = await createActionClient(false);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: "Your password couldn’t be updated. Request a new link and try again." };
  } catch {
    return { error: "The secure connection is not configured yet. Add the Supabase keys to .env.local." };
  }

  redirect("/");
}
