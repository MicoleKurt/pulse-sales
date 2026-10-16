"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Building2, CreditCard, Gauge, LogOut, Mail, Megaphone, Menu, ScrollText, SlidersHorizontal, Users, Webhook, X } from "lucide-react";
import { clsx } from "clsx";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui";
import { BrandMark, RoleBadge, SidebarLink } from "@/components/app-shell";
import { logout } from "@/app/(auth)/actions";

const SECTIONS = [
  { title: "Business", items: [
    { href: "/admin", label: "Overview", icon: Gauge },
    { href: "/admin/organizations", label: "Organizations", icon: Building2 },
    { href: "/admin/users", label: "Users", icon: Users },
  ] },
  { title: "Revenue", items: [
    { href: "/admin/billing", label: "Billing", icon: CreditCard },
    { href: "/admin/plans", label: "Plans & limits", icon: SlidersHorizontal },
  ] },
  { title: "System", items: [
    { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/admin/audit", label: "Platform audit", icon: ScrollText },
    { href: "/admin/system", label: "Webhooks & emails", icon: Webhook },
  ] },
];

function Nav({ user, role, onNavigate }: { user: { name: string }; role: string; onNavigate?: () => void }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/admin" ? path === href : path.startsWith(href));
  return (
    <div className="flex h-full flex-col border-r border-border bg-admin-bg text-sidebar-fg shadow-[4px_0_24px_rgb(0_0_0/0.45)]">
      <div className="border-b border-border px-5 py-4">
        <BrandMark subtitle="Platform Console" />
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto py-5" aria-label="Admin">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <span className="label-caps block px-5 pb-1 text-[10px] text-sidebar-muted/70">{s.title}</span>
            <div className="space-y-0.5">
              {s.items.map((i) => (
                <SidebarLink key={i.href} href={i.href} icon={i.icon} label={i.label} active={isActive(i.href)} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-border">
        <SidebarLink href="/dashboard" icon={ArrowLeft} label="Back to app" active={false} onNavigate={onNavigate} />
        <div className="flex items-center gap-2.5 px-4 py-3">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium leading-tight">{user.name}</span>
            <span className="mt-0.5 block"><RoleBadge role={role} /></span>
          </div>
          <form action={logout}>
            <button title="Sign out" aria-label="Sign out" className="rounded p-1 text-sidebar-muted transition-colors hover:text-danger">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ user, role, children }: { user: { name: string; email: string }; role: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const roleLabel = role === "super" ? "Super admin" : "Support";
  const iconBtn = "grid size-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-accent/35 hover:bg-accent/8 hover:text-accent";
  return (
    <div className="min-h-dvh lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block"><Nav user={user} role={roleLabel} /></aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-60 animate-in-left">
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-3 top-5 z-10 text-sidebar-muted"><X className="size-5" /></button>
            <Nav user={user} role={roleLabel} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-header-bg px-4 shadow-[0_2px_16px_rgb(0_0_0/0.25)] backdrop-blur sm:px-6">
        <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className={clsx(iconBtn, "lg:hidden")}><Menu className="size-4" /></button>
        <span className="font-display text-base font-bold tracking-tight">Platform console</span>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/admin/system" className="hidden items-center gap-1.5 rounded-md border border-accent/20 px-2.5 py-1.5 font-display text-xs font-bold tracking-[0.04em] text-muted transition-colors hover:border-accent/40 hover:bg-accent/8 hover:text-accent sm:flex">
            <Mail className="size-3.5" /> Outbox
          </Link>
          <ThemeToggle />
          <span className="ml-1 hidden items-center gap-2.5 sm:flex">
            <Avatar name={user.name} />
            <span className="text-right">
              <span className="block text-sm font-medium leading-tight">{user.name}</span>
              <span className="mt-0.5 flex justify-end"><RoleBadge role={roleLabel} /></span>
            </span>
          </span>
          <form action={logout}>
            <button className="h-9 rounded-md border border-danger/25 bg-danger/8 px-3 font-display text-xs font-bold tracking-[0.05em] text-danger transition-colors hover:border-danger/45 hover:bg-danger/15">
              Logout
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div key={path} className="animate-in-up">{children}</div>
      </main>
    </div>
  );
}
