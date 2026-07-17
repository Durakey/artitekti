import { Aperture } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({ children, eyebrow, title, description }: { children: ReactNode; eyebrow: string; title: string; description: string }) {
  return (
    <main className="relative grid min-h-screen overflow-hidden lg:grid-cols-[1fr_0.9fr]">
      <section className="relative hidden overflow-hidden border-r border-white/10 bg-[#101014] p-12 lg:flex lg:flex-col">
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_15%_20%,#6c5e4b_0,transparent_30%),radial-gradient(circle_at_80%_80%,#393128_0,transparent_35%)]" />
        <div className="relative flex items-center gap-3 text-sm font-medium tracking-tight text-white">
          <span className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm"><Aperture className="size-4" /></span>
          Blux Interior
        </div>
        <div className="relative my-auto max-w-md">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.22em] text-[#d6c3a6]">Private workspace</p>
          <h1 className="text-balance text-5xl font-medium tracking-[-0.055em] text-white">A calmer way to deliver exceptional spaces.</h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-zinc-400">Your projects, procurement and decisions—beautifully organised in one private place.</p>
        </div>
        <p className="relative text-sm text-zinc-500">Designed for the details that make a space feel complete.</p>
      </section>
      <section className="relative flex items-center justify-center bg-background px-6 py-12 sm:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(214,195,166,0.08),transparent_27%)]" />
        <div className="relative w-full max-w-sm">
          <div className="mb-12 flex items-center gap-3 lg:hidden"><span className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/5"><Aperture className="size-4" /></span><span className="text-sm font-medium">Blux Interior</span></div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#d6c3a6]">{eyebrow}</p>
          <h2 className="mt-4 text-3xl font-medium tracking-[-0.04em] text-white">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
