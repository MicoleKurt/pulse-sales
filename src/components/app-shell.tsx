"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Activity, Bell, Menu, Search, X } from "lucide-react";
import { clsx } from "clsx";
import { navSections, allNavItems } from "@/lib/nav";
import { ThemeToggle } from "./theme-toggle";

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-sidebar-from to-sidebar-to text-sidebar-fg">
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="grid size-8 place-items-center rounded-lg bg-white/15">
          <Activity className="size-4" />
        </span>
        <span className="text-lg font-semibold tracking-tight">Pulse Sales</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Main">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-white/50">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                        active ? "bg-white/15 font-medium" : "text-white/75 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon className="size-4" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="m-3 rounded-lg bg-white/10 p-3 text-xs text-white/80">
        <p className="font-medium text-white">Free plan</p>
        <p className="mt-0.5">Upgrade for more seats and exports.</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = allNavItems.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 z-10 text-white/80"
            >
              <X className="size-5" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="grid size-9 place-items-center rounded-lg border border-border text-muted lg:hidden"
        >
          <Menu className="size-4" />
        </button>
        <h1 className="text-base font-semibold">{current?.label ?? "Pulse Sales"}</h1>

        <div className="ml-auto flex items-center gap-2">
          <label className="hidden items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-muted md:flex">
            <Search className="size-4" />
            <input placeholder="Search…" className="w-48 bg-transparent outline-none placeholder:text-muted" />
            <kbd className="rounded border border-border px-1.5 text-[10px]">Ctrl K</kbd>
          </label>
          <button
            type="button"
            aria-label="Notifications"
            className="grid size-9 place-items-center rounded-lg border border-border bg-surface text-muted hover:text-text"
          >
            <Bell className="size-4" />
          </button>
          <ThemeToggle />
          <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-medium text-primary-fg">
            IG
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
