import { Aperture } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({ children, eyebrow, title, description }: { children: ReactNode; eyebrow: string; title: string; description: string }) {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#FAF8F5] lg:grid-cols-[1fr_0.9fr]">
      <section className="relative hidden overflow-hidden border-r border-slate-200 bg-slate-950 p-12 lg:flex lg:flex-col">
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.08)_0,transparent_30%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.06)_0,transparent_35%)]" />
        <div className="relative flex items-center gap-3 text-sm font-semibold tracking-tight text-white">
          <span className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm"><Aperture className="size-4" /></span>
          Blux Interior
        </div>
        <div className="relative my-auto max-w-md">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#d6c3a6]">Private workspace</p>
          <h1 className="text-5xl font-semibold tracking-[-0.055em] text-white">A calmer way to deliver exceptional spaces.</h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-slate-300">Your projects, procurement and decisions—beautifully organised in one private place.</p>
        </div>
        <p className="relative text-sm text-slate-400">Designed for the details that make a space feel complete.</p>
      </section>
      <section className="relative flex items-center justify-center bg-[#FAF8F5] px-6 py-12 sm:px-10">
        <div className="relative w-full max-w-sm">
          <div className="mb-12 flex items-center gap-3 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-900"><Aperture className="size-4" /></span>
            <span className="text-sm font-semibold text-slate-900">Blux Interior</span>
          </div>
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b08d5a]">{eyebrow}</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#111827]">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
