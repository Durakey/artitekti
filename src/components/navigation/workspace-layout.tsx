"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, CalendarDays, FolderKanban, CreditCard, PackageSearch, Settings2 } from "lucide-react";

type NavigationItem = {
  href: string | null;
  label: string;
  icon: typeof CalendarDays;
  placeholder?: boolean;
  badge?: number;
};

function NavLink({ href, label, Icon, active, placeholder, badge }: { href: string | null; label: string; Icon: typeof CalendarDays; active: boolean; placeholder?: boolean; badge?: number }) {
  if (!href) {
    return (
      <div className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-muted-foreground">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <span className="font-medium">{label}</span>
        {placeholder ? <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Soon</span> : null}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "bg-[#efe5d7] text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <span className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${active ? "bg-[#e7d8c0] text-foreground" : "bg-muted text-muted-foreground group-hover:text-foreground"}`}>
        <Icon className="size-4" />
      </span>
      <span>{label}</span>
      {badge && badge > 0 ? (
        <span className="ml-auto rounded-full border border-[#fca5a5] bg-[#fee2e2] px-2 py-0.5 text-[11px] font-semibold text-[#b91c1c]">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

type WorkspaceLayoutProps = {
  children: React.ReactNode;
  overdueCount?: number;
};

export function WorkspaceLayout({ children, overdueCount = 0 }: WorkspaceLayoutProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activePath = pathname === "/" ? "/today" : pathname;
  const authRoutes = ["/sign-in", "/forgot-password", "/update-password"];
  const hideShell = authRoutes.some((route) => activePath.startsWith(route));

  if (hideShell) {
    return <>{children}</>;
  }

  const navigationItems: NavigationItem[] = [
    { href: "/today", label: "Today", icon: CalendarDays, badge: overdueCount },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/payments", label: "Payments", icon: CreditCard },
    { href: null, label: "Suppliers", icon: PackageSearch, placeholder: true },
    { href: "/settings", label: "Workspace", icon: Settings2 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 shrink-0 flex-col border-r bg-card p-6 md:flex">
        <div className="flex items-center gap-3 border-b pb-6">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d6c3a6] text-black font-bold">B</div>
          <div>
            <p className="text-sm font-semibold">Blux Interior</p>
            <p className="text-xs text-muted-foreground">Workspace</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1.5">
          {navigationItems.map((item) => (
            <NavLink
              key={item.label}
              href={item.href}
              label={item.label}
              Icon={item.icon}
              placeholder={item.placeholder}
              badge={item.badge}
              active={item.href ? activePath === item.href || activePath.startsWith(`${item.href}/`) : false}
            />
          ))}
        </nav>

        <div className="mt-auto rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Focused workspace</p>
          <p className="mt-1.5 text-xs">Keep today, projects, and payments in one calm workspace.</p>
        </div>
      </aside>

      <div className="md:pl-72">
        <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur-sm md:hidden">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#d6c3a6] text-black font-bold">B</div>
            <div>
              <p className="text-sm font-semibold">Blux Interior</p>
              <p className="text-xs text-muted-foreground">Workspace</p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
        </div>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
            <aside className="relative z-10 w-72 shrink-0 border-r bg-card p-6">
              <div className="flex items-center justify-between gap-3 border-b pb-6">
                <div>
                  <p className="text-sm font-semibold">Blux Interior</p>
                  <p className="text-xs text-muted-foreground">Workspace</p>
                </div>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-2xl border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close navigation"
                >
                  <X className="size-5" />
                </button>
              </div>

              <nav className="mt-8 flex flex-col gap-1.5">
                {navigationItems.map((item) => (
                  <NavLink
                    key={item.label}
                    href={item.href}
                    label={item.label}
                    Icon={item.icon}
                    placeholder={item.placeholder}
                    badge={item.badge}
                    active={item.href ? activePath === item.href || activePath.startsWith(`${item.href}/`) : false}
                  />
                ))}
              </nav>
            </aside>
          </div>
        )}

        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
