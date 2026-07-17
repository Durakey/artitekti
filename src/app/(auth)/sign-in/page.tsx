import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return <AuthShell description="Sign in to manage your projects, purchases and every finishing detail." eyebrow="Welcome back" title="Your workspace awaits."><SignInForm /></AuthShell>;
}
