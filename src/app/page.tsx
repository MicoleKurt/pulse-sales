import Link from "next/link";
import { Activity, BarChart3, Check, FileDown, ReceiptText, ScrollText, ShieldCheck, Tag, Users } from "lucide-react";
import { getSession } from "@/lib/auth";
import { DEFAULT_PLAN_LIMITS, PLAN_FEATURES } from "@/lib/plans";
import { LinkButton } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  { icon: ReceiptText, title: "Sales & line items", body: "Record transactions in seconds. Prices auto-fill from history for the sale date." },
  { icon: BarChart3, title: "Live dashboards", body: "Revenue, top reps, top customers and trends, filtered by any date range." },
  { icon: ShieldCheck, title: "Granular rights", body: "Owner, admin, manager and rep roles with an editable rights matrix." },
  { icon: Tag, title: "Price history", body: "Effective-dated pricing so old invoices stay correct when prices change." },
  { icon: ScrollText, title: "Audit log & restore", body: "Every change is recorded. Deleted sales can be restored with their items." },
  { icon: FileDown, title: "Exports", body: "CSV, Excel and PDF reports and invoices, ready for your accountant." },
];

const FAQ = [
  ["Is there a free plan?", "Yes. Free covers one seat and 100 sales a month. Every new workspace also gets 14 days of Pro."],
  ["Can my reps only see their own sales?", "Yes. Reps see their own sales by default; managers and admins can see everyone's. You can change this in the rights matrix."],
  ["Can I import my existing data?", "Import customers and products from CSV with a preview before anything is saved."],
  ["What happens if I delete something by mistake?", "Deletes are soft. Restore sales, customers, products and prices from Deleted items."],
];

export default async function Landing() {
  const session = await getSession();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-fg"><Activity className="size-4" /></span>
            Pulse Sales
          </Link>
          <nav className="ml-6 hidden gap-6 text-sm text-muted md:flex">
            <a href="#features" className="hover:text-text">Features</a>
            <a href="#pricing" className="hover:text-text">Pricing</a>
            <a href="#faq" className="hover:text-text">FAQ</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {session ? (
              <LinkButton href="/dashboard">Open app</LinkButton>
            ) : (
              <>
                <LinkButton href="/login" variant="ghost" className="hidden sm:inline-flex">Sign in</LinkButton>
                <LinkButton href="/signup">Start free</LinkButton>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-accent/5 to-transparent" />
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
            <span className="size-1.5 rounded-full bg-accent" /> 14-day Pro trial · no card required
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Sales management your whole team <span className="text-primary">actually uses</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted">Track every sale, rep and customer. Control who can see and change what. Know your numbers in real time.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton href="/signup" className="h-12 px-6 text-base">Start your free trial</LinkButton>
            <LinkButton href="/login" variant="secondary" className="h-12 px-6 text-base">Sign in</LinkButton>
          </div>
          <div className="mx-auto mt-14 grid max-w-4xl gap-4 rounded-2xl border border-border bg-surface p-4 text-left shadow-[var(--shadow)] sm:grid-cols-4">
            {[
              ["Revenue", "$48,210", "+12.4%"],
              ["Sales", "312", "+8.1%"],
              ["Avg. order", "$154.52", "+3.9%"],
              ["Top rep", "Maria S.", "$11.2k"],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-xl bg-surface-2 p-4">
                <p className="text-xs text-muted">{l}</p>
                <p className="tabular mt-1 text-xl font-semibold">{v}</p>
                <p className="text-xs text-success">{c}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Example dashboard</p>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Everything a sales team needs</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-surface p-6">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-y border-border bg-surface-2/50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-semibold tracking-tight">Simple per-seat pricing</h2>
          <p className="mt-2 text-center text-muted">Start free. Upgrade when your team grows.</p>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {DEFAULT_PLAN_LIMITS.map((p) => (
              <div key={p.plan} className={`flex flex-col rounded-2xl border bg-surface p-8 ${p.plan === "pro" ? "border-primary ring-2 ring-primary" : "border-border"}`}>
                <h3 className="text-lg font-semibold capitalize">{p.plan}</h3>
                <p className="mt-3"><span className="text-4xl font-semibold">${p.pricePerSeat}</span><span className="text-muted"> / seat / mo</span></p>
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {PLAN_FEATURES[p.plan].map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" />{f}</li>)}
                </ul>
                <LinkButton href="/signup" variant={p.plan === "pro" ? "primary" : "secondary"} className="mt-8 w-full">
                  {p.plan === "free" ? "Start free" : "Start 14-day trial"}
                </LinkButton>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Questions</h2>
        <div className="mt-10 divide-y divide-border rounded-xl border border-border bg-surface">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-6 py-4">
              <summary className="cursor-pointer list-none font-medium">{q}</summary>
              <p className="mt-2 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row">
          <span className="flex items-center gap-2"><Users className="size-4" /> © {new Date().getFullYear()} Pulse Sales</span>
          <div className="flex gap-4">
            <a href="#pricing" className="hover:text-text">Pricing</a>
            <Link href="/login" className="hover:text-text">Sign in</Link>
            <Link href="/signup" className="hover:text-text">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
