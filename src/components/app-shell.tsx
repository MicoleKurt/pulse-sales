"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, Check, ChevronsUpDown, Eye, KeyRound, LogOut, Megaphone, Menu, Search, Shield, UserRound, X } from "lucide-react";
import { clsx } from "clsx";
import { navSections, allNavItems } from "@/lib/nav";
import type { Right } from "@/lib/rights";
import { ThemeToggle } from "./theme-toggle";
import { Avatar } from "./ui";
import { logout } from "@/app/(auth)/actions";
import { markNotificationsRead, stopImpersonating, switchOrg } from "@/app/(app)/shell-actions";

/*
 * App chrome ported from HopeSMS's AppShell: 240px dark sidebar with caps section labels and a
 * glowing left-edge active marker, user footer with role badge + logout, and a 56px top bar with
 * the user's badge, a Password shortcut and a tinted Logout button. Pages fade up on navigation.
 */

type Props = {
  user: { name: string; email: string; role: string };
  org: { id: string; name: string; status: string };
  orgs: { id: string; name: string }[];
  rights: Right[];
  plan: string;
  trialDaysLeft: number | null;
  impersonating: boolean;
  isPlatformAdmin: boolean;
  unread: number;
  notifications: { id: string; title: string; body: string | null; href: string | null; read: boolean; createdAt: string }[];
  announcements: { id: string; message: string; tone: string }[];
  children: React.ReactNode;
};

function useClickOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  return ref;
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-2 py-px font-display text-[10px] font-bold uppercase tracking-[0.06em] text-primary">
      {role}
    </span>
  );
}

export function BrandMark({ subtitle = "Sales Management" }: { subtitle?: string }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/12 font-display text-sm font-bold text-primary shadow-[0_0_14px_color-mix(in_srgb,var(--primary)_22%,transparent)]">
        P
      </span>
      <span className="leading-tight">
        <span className="block font-display text-[15px] font-bold tracking-tight text-sidebar-fg">Pulse Sales</span>
        <span className="block text-[11px] tracking-[0.06em] text-sidebar-muted">{subtitle}</span>
      </span>
    </Link>
  );
}

export function SidebarLink({ href, icon: Icon, label, active, onNavigate }: { href: string; icon: React.ElementType; label: string; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex items-center gap-2.5 border-l-2 py-2 pl-5 pr-4 text-sm transition-colors duration-150",
        active
          ? "border-sidebar-active bg-primary/8 font-semibold text-sidebar-active shadow-[inset_0_0_20px_color-mix(in_srgb,var(--primary)_6%,transparent)]"
          : "border-transparent text-sidebar-muted hover:bg-white/[0.03] hover:text-sidebar-fg",
      )}
    >
      <Icon className="size-[15px] shrink-0 opacity-80" />
      {label}
    </Link>
  );
}

function Sidebar({ user, rights, plan, trialDaysLeft, org, orgs, onNavigate }: Pick<Props, "user" | "rights" | "plan" | "trialDaysLeft" | "org" | "orgs"> & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [orgOpen, setOrgOpen] = useState(false);
  const [, start] = useTransition();
  const ref = useClickOutside(() => setOrgOpen(false));
  const can = (r?: Right) => !r || rights.includes(r);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex h-full flex-col border-r border-border bg-sidebar-bg text-sidebar-fg shadow-[4px_0_24px_rgb(0_0_0/0.4)]">
      <div className="border-b border-border px-5 py-4">
        <BrandMark />
      </div>

      <div ref={ref} className="relative px-3 pt-4">
        <button
          type="button"
          onClick={() => setOrgOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:border-border-strong hover:bg-white/[0.03]"
        >
          <span className="min-w-0">
            <span className="label-caps block text-[9px] text-sidebar-muted">Workspace</span>
            <span className="block truncate font-medium">{org.name}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-sidebar-muted" />
        </button>
        {orgOpen && (
          <div className="absolute inset-x-3 top-[4.5rem] z-20 rounded-xl border border-border-strong bg-surface-3 p-1 text-text shadow-[var(--shadow-lift)] animate-in-down">
            {orgs.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => start(() => switchOrg(o.id))}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
              >
                <span className="truncate">{o.name}</span>
                {o.id === org.id && <Check className="size-4 text-primary" />}
              </button>
            ))}
            <Link href="/onboarding" className="mt-1 block rounded-md border-t border-border px-2 py-1.5 text-sm text-muted hover:bg-surface-2">
              + New workspace
            </Link>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto py-5" aria-label="Main">
        {navSections.map((section) => {
          const items = section.items.filter((i) => can(i.right));
          if (!items.length) return null;
          return (
            <div key={section.title}>
              <span className="label-caps block px-5 pb-1 text-[10px] text-sidebar-muted/70">{section.title}</span>
              <div className="space-y-0.5">
                {items.map(({ href, label, icon }) => (
                  <SidebarLink key={href} href={href} icon={icon} label={label} active={isActive(href)} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <Link
        href="/settings/billing"
        onClick={onNavigate}
        className="mx-3 mb-3 block rounded-lg border border-primary/20 bg-primary/6 px-3 py-2.5 text-xs transition-colors hover:border-primary/35 hover:bg-primary/10"
      >
        <span className="label-caps block text-[10px] text-primary">{plan} plan</span>
        <span className="mt-0.5 block text-sidebar-muted">
          {trialDaysLeft != null ? `Trial: ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left` : plan === "free" ? "Upgrade for more seats and exports." : "Manage billing →"}
        </span>
      </Link>

      <div className="border-t border-border">
        <SidebarLink href="/profile" icon={UserRound} label="My Profile" active={pathname === "/profile"} onNavigate={onNavigate} />
        <div className="flex items-center gap-2.5 px-4 py-3">
          <Avatar name={user.name} />
          <Link href="/profile" onClick={onNavigate} className="min-w-0 flex-1" title="View profile">
            <span className="block truncate text-sm font-medium leading-tight">{user.name}</span>
            <span className="mt-0.5 block">
              <RoleBadge role={user.role} />
            </span>
          </Link>
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

export function AppShell(props: Props) {
  const { user, unread, notifications, announcements, impersonating, isPlatformAdmin, org, children } = props;
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<"bell" | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const bellRef = useClickOutside(() => setMenu(null));
  const current = allNavItems.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const iconBtn = "grid size-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-accent/35 hover:bg-accent/8 hover:text-accent";

  return (
    <div className="min-h-dvh lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">
        <Sidebar {...props} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-60 animate-in-left">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-5 z-10 text-sidebar-muted">
              <X className="size-5" />
            </button>
            <Sidebar {...props} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {impersonating && (
        <div className="flex items-center justify-center gap-3 border-b border-warning/30 bg-warning/12 px-4 py-2 text-sm font-medium text-warning">
          <Eye className="size-4" /> Viewing {org.name} as platform admin (read-only)
          <form action={stopImpersonating}>
            <button className="rounded border border-warning/40 px-2 py-0.5 hover:bg-warning/15">Exit</button>
          </form>
        </div>
      )}
      {org.status === "suspended" && !impersonating && (
        <div className="border-b border-danger/30 bg-danger/12 px-4 py-2 text-center text-sm font-medium text-danger">
          This workspace is suspended. Data is read-only. Contact support.
        </div>
      )}
      {announcements
        .filter((a) => !dismissed.includes(a.id))
        .map((a) => (
          <div key={a.id} className="flex items-center gap-3 border-b border-primary/25 bg-primary/10 px-4 py-2 text-sm text-primary">
            <Megaphone className="size-4 shrink-0" />
            <span className="flex-1">{a.message}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setDismissed((d) => [...d, a.id])}>
              <X className="size-4" />
            </button>
          </div>
        ))}

      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-header-bg px-4 shadow-[0_2px_16px_rgb(0_0_0/0.25)] backdrop-blur sm:px-6">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className={clsx(iconBtn, "lg:hidden")}>
          <Menu className="size-4" />
        </button>
        <h1 className="truncate font-display text-base font-bold tracking-tight">
          {current?.label ?? (pathname.startsWith("/profile") ? "My Profile" : pathname.startsWith("/search") ? "Search" : "Pulse Sales")}
        </h1>

        <div className="ml-auto flex items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchRef.current?.value.trim();
              if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
            }}
            className="hidden h-9 items-center gap-2 rounded-lg border border-border bg-input px-3 text-sm text-muted transition-colors focus-within:border-primary/50 md:flex"
          >
            <Search className="size-4" />
            <input ref={searchRef} placeholder="Search sales, customers…" aria-label="Search" className="w-48 bg-transparent text-text outline-none placeholder:text-faint" />
            <kbd className="rounded border border-border px-1.5 font-display text-[10px] tracking-wide">CTRL K</kbd>
          </form>
          <Link href="/search" aria-label="Search" className={clsx(iconBtn, "md:hidden")}>
            <Search className="size-4" />
          </Link>

          <div ref={bellRef} className="relative">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => {
                setMenu(menu === "bell" ? null : "bell");
                if (unread) markNotificationsRead();
              }}
              className={clsx(iconBtn, "relative")}
            >
              <Bell className="size-4" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-danger font-display text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            {menu === "bell" && (
              <div className="absolute right-0 top-11 w-80 rounded-xl border border-border-strong bg-surface-3 p-2 shadow-[var(--shadow-lift)] animate-in-down">
                <p className="label-caps px-2 py-1 text-muted">Notifications</p>
                {notifications.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted">You&apos;re all caught up.</p>
                ) : (
                  notifications.map((n) => (
                    <Link key={n.id} href={n.href ?? "#"} onClick={() => setMenu(null)} className="block rounded-lg px-2 py-2 hover:bg-surface-2">
                      <p className={clsx("text-sm", !n.read && "font-medium")}>{n.title}</p>
                      {n.body && <p className="text-xs text-muted">{n.body}</p>}
                      <p className="mt-0.5 text-[11px] text-faint">{new Date(n.createdAt).toLocaleString()}</p>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          <ThemeToggle />

          <Link href="/profile" title="My Profile" className="ml-1 flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <Avatar name={user.name} />
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-medium leading-tight">{user.name}</span>
              <span className="mt-0.5 flex justify-end">
                <RoleBadge role={user.role} />
              </span>
            </span>
          </Link>

          {isPlatformAdmin && (
            <Link href="/admin" title="Platform admin" aria-label="Platform admin" className={iconBtn}>
              <Shield className="size-4" />
            </Link>
          )}
          <Link
            href="/profile#password"
            title="Change password"
            className="hidden h-9 items-center gap-1.5 rounded-md border border-accent/20 px-2.5 font-display text-xs font-bold tracking-[0.04em] text-muted transition-colors hover:border-accent/40 hover:bg-accent/8 hover:text-accent sm:flex"
          >
            <KeyRound className="size-3.5" /> Password
          </Link>
          <form action={logout}>
            <button className="h-9 rounded-md border border-danger/25 bg-danger/8 px-3 font-display text-xs font-bold tracking-[0.05em] text-danger transition-colors hover:border-danger/45 hover:bg-danger/15">
              Logout
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div key={pathname} className="animate-in-up">
          {children}
        </div>
      </main>
    </div>
  );
}
