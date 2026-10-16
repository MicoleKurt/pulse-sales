"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Activity, Bell, Check, ChevronsUpDown, Eye, LogOut, Menu, Megaphone, Search, Shield, User, X } from "lucide-react";
import { clsx } from "clsx";
import { navSections, allNavItems } from "@/lib/nav";
import type { Right } from "@/lib/rights";
import { ThemeToggle } from "./theme-toggle";
import { Avatar } from "./ui";
import { logout } from "@/app/(auth)/actions";
import { markNotificationsRead, stopImpersonating, switchOrg } from "@/app/(app)/shell-actions";

type Props = {
  user: { name: string; email: string };
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

function Sidebar({ rights, plan, trialDaysLeft, org, orgs, onNavigate }: Pick<Props, "rights" | "plan" | "trialDaysLeft" | "org" | "orgs"> & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [orgOpen, setOrgOpen] = useState(false);
  const [, start] = useTransition();
  const ref = useClickOutside(() => setOrgOpen(false));
  const can = (r?: Right) => !r || rights.includes(r);

  return (
    <div className="flex h-full flex-col bg-sidebar-bg text-sidebar-fg">
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="grid size-8 place-items-center rounded-lg bg-white/15">
          <Activity className="size-4" />
        </span>
        <span className="text-lg font-semibold tracking-tight">Pulse Sales</span>
      </div>

      <div ref={ref} className="relative px-3">
        <button
          type="button"
          onClick={() => setOrgOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-left text-sm hover:bg-white/15"
        >
          <span className="truncate font-medium">{org.name}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-white/60" />
        </button>
        {orgOpen && (
          <div className="absolute inset-x-3 top-11 z-20 rounded-lg border border-border bg-surface p-1 text-text shadow-lg">
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

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Main">
        {navSections.map((section) => {
          const items = section.items.filter((i) => can(i.right));
          if (!items.length) return null;
          return (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-white/50">{section.title}</p>
              <ul className="space-y-0.5">
                {items.map(({ href, label, icon: Icon }) => {
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
          );
        })}
      </nav>

      <Link href="/settings/billing" onClick={onNavigate} className="m-3 block rounded-lg bg-white/10 p-3 text-xs text-white/80 hover:bg-white/15">
        <p className="font-medium capitalize text-white">{plan} plan</p>
        <p className="mt-0.5">{trialDaysLeft != null ? `Trial: ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left` : plan === "free" ? "Upgrade for more seats and exports." : "Manage billing →"}</p>
      </Link>
    </div>
  );
}

export function AppShell(props: Props) {
  const { user, unread, notifications, announcements, impersonating, isPlatformAdmin, org, children } = props;
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<"bell" | "user" | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const bellRef = useClickOutside(() => setMenu((m) => (m === "bell" ? null : m)));
  const userRef = useClickOutside(() => setMenu((m) => (m === "user" ? null : m)));
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

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <Sidebar {...props} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-5 z-10 text-white/80">
              <X className="size-5" />
            </button>
            <Sidebar {...props} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {impersonating && (
        <div className="flex items-center justify-center gap-3 bg-warning px-4 py-2 text-sm font-medium text-black">
          <Eye className="size-4" /> Viewing {org.name} as platform admin (read-only)
          <form action={stopImpersonating}>
            <button className="rounded bg-black/15 px-2 py-0.5 hover:bg-black/25">Exit</button>
          </form>
        </div>
      )}
      {org.status === "suspended" && !impersonating && (
        <div className="bg-danger px-4 py-2 text-center text-sm font-medium text-white">This workspace is suspended. Data is read-only. Contact support.</div>
      )}
      {announcements
        .filter((a) => !dismissed.includes(a.id))
        .map((a) => (
          <div key={a.id} className="flex items-center gap-3 bg-primary px-4 py-2 text-sm text-primary-fg">
            <Megaphone className="size-4 shrink-0" />
            <span className="flex-1">{a.message}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setDismissed((d) => [...d, a.id])}>
              <X className="size-4" />
            </button>
          </div>
        ))}

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur sm:px-6">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="grid size-9 place-items-center rounded-lg border border-border text-muted lg:hidden">
          <Menu className="size-4" />
        </button>
        <h1 className="truncate text-base font-semibold">{current?.label ?? (pathname.startsWith("/profile") ? "Profile" : pathname.startsWith("/search") ? "Search" : "Pulse Sales")}</h1>

        <div className="ml-auto flex items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchRef.current?.value.trim();
              if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
            }}
            className="hidden items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-muted md:flex"
          >
            <Search className="size-4" />
            <input ref={searchRef} placeholder="Search sales, customers…" aria-label="Search" className="w-52 bg-transparent text-text outline-none placeholder:text-muted" />
            <kbd className="rounded border border-border px-1.5 text-[10px]">Ctrl K</kbd>
          </form>
          <Link href="/search" aria-label="Search" className="grid size-9 place-items-center rounded-lg border border-border bg-surface text-muted md:hidden">
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
              className="relative grid size-9 place-items-center rounded-lg border border-border bg-surface text-muted hover:text-text"
            >
              <Bell className="size-4" />
              {unread > 0 && <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-danger text-[10px] font-semibold text-white">{unread > 9 ? "9+" : unread}</span>}
            </button>
            {menu === "bell" && (
              <div className="absolute right-0 top-11 w-80 rounded-xl border border-border bg-surface p-2 shadow-lg">
                <p className="px-2 py-1 text-xs font-medium text-muted">Notifications</p>
                {notifications.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted">You&apos;re all caught up.</p>
                ) : (
                  notifications.map((n) => (
                    <Link key={n.id} href={n.href ?? "#"} onClick={() => setMenu(null)} className="block rounded-lg px-2 py-2 hover:bg-surface-2">
                      <p className={clsx("text-sm", !n.read && "font-medium")}>{n.title}</p>
                      {n.body && <p className="text-xs text-muted">{n.body}</p>}
                      <p className="mt-0.5 text-[11px] text-muted">{new Date(n.createdAt).toLocaleString()}</p>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          <ThemeToggle />

          <div ref={userRef} className="relative">
            <button type="button" aria-label="Account menu" onClick={() => setMenu(menu === "user" ? null : "user")} className="rounded-full focus-visible:outline-2 focus-visible:outline-primary">
              <Avatar name={user.name} />
            </button>
            {menu === "user" && (
              <div className="absolute right-0 top-11 w-60 rounded-xl border border-border bg-surface p-1 shadow-lg">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
                <Link href="/profile" onClick={() => setMenu(null)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2">
                  <User className="size-4" /> Profile
                </Link>
                {isPlatformAdmin && (
                  <Link href="/admin" onClick={() => setMenu(null)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2">
                    <Shield className="size-4" /> Platform admin
                  </Link>
                )}
                <form action={logout}>
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-surface-2">
                    <LogOut className="size-4" /> Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
