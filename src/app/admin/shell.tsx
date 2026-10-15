"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Building2, CreditCard, Gauge, LogOut, Mail, Megaphone, Menu, ScrollText, Shield, SlidersHorizontal, Users, Webhook, X } from "lucide-react";
import { clsx } from "clsx";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, Badge } from "@/components/ui";
import { logout } from "@/app/(auth)/actions";

const NAV = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/plans", label: "Plans & limits", icon: SlidersHorizontal },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/audit", label: "Platform audit", icon: ScrollText },
  { href: "/admin/system", label: "Webhooks & emails", icon: Webhook },
];

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <div className="flex h-full flex-col bg-admin-bg text-white">
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="grid size-8 place-items-center rounded-lg bg-accent/20 text-accent"><Shield className="size-4" /></span>
        <span className="font-semibold">Pulse Admin</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? path === href : path.startsWith(href);
          return (
            <Link key={href} href={href} onClick={onNavigate} className={clsx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm", active ? "bg-white/10 font-medium" : "text-white/65 hover:bg-white/5 hover:text-white")}>
              <Icon className="size-4" /> {label}
            </Link>
          );
        })}
      </nav>
      <Link href="/dashboard" className="m-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/65 hover:bg-white/5 hover:text-white">
        <ArrowLeft className="size-4" /> Back to app
      </Link>
    </div>
  );
}

export function AdminShell({ user, role, children }: { user: { name: string; email: string }; role: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh lg:pl-60">
      <aside className="fixed inset-y-0 left-0 hidden w-60 lg:block"><Nav /></aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-60">
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-3 top-5 z-10 text-white/80"><X className="size-5" /></button>
            <Nav onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur sm:px-6">
        <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="grid size-9 place-items-center rounded-lg border border-border text-muted lg:hidden"><Menu className="size-4" /></button>
        <span className="text-sm font-semibold">Platform console</span>
        <Badge tone="accent">{role}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <a href="/admin/system" className="hidden items-center gap-1 text-xs text-muted hover:text-text sm:flex"><Mail className="size-3.5" /> Outbox</a>
          <ThemeToggle />
          <Avatar name={user.name} />
          <form action={logout}>
            <button aria-label="Sign out" className="grid size-9 place-items-center rounded-lg border border-border text-muted hover:text-danger"><LogOut className="size-4" /></button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
