import Link from "next/link";
import { Activity, ArrowRight, BarChart3, Check, ChevronDown, FileDown, ReceiptText, ScrollText, ShieldCheck, Tag } from "lucide-react";
import { getSession } from "@/lib/auth";
import { DEFAULT_PLAN_LIMITS, PLAN_FEATURES } from "@/lib/plans";
import { LinkButton, type Tone } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { FloatingPaths } from "@/components/floating-paths";

// Feature cards use HOPE's coloured top edge + caps code line (as in HOPE's feature slides).
const FEATURES: { icon: typeof ReceiptText; title: string; code: string; body: string; tone: Tone }[] = [
  { icon: ReceiptText, title: "Sales & line items", code: "SALES_ADD", body: "Record transactions in seconds. Prices auto-fill from history for the sale date.", tone: "primary" },
  { icon: BarChart3, title: "Live dashboards", code: "REPORT_VIEW", body: "Revenue, top reps, top customers and trends, filtered by any date range.", tone: "accent" },
  { icon: ShieldCheck, title: "Granular rights", code: "TEAM_ADMIN", body: "Owner, admin, manager and rep roles with an editable rights matrix.", tone: "gold" },
  { icon: Tag, title: "Price history", code: "LOOKUP_EDIT", body: "Effective-dated pricing so old invoices stay correct when prices change.", tone: "pink" },
  { icon: ScrollText, title: "Audit log & restore", code: "AUDIT_VIEW", body: "Every change is recorded. Deleted sales can be restored with their items.", tone: "success" },
  { icon: FileDown, title: "Exports", code: "EXPORT", body: "CSV, Excel and PDF reports and invoices, ready for your accountant.", tone: "primary" },
];

const FAQ = [
  ["Is there a free plan?", "Yes. Free covers one seat and 100 sales a month. Every new workspace also gets 14 days of Pro."],
  ["Can my reps only see their own sales?", "Yes. Reps see their own sales by default; managers and admins can see everyone's. You can change this in the rights matrix."],
  ["Can I import my existing data?", "Import customers and products from CSV with a preview before anything is saved."],
  ["What happens if I delete something by mistake?", "Deletes are soft. Restore sales, customers, products and prices from Deleted items."],
];

const toneVar = (t: Tone) => `var(--${t})`;

export default async function Landing() {
  const session = await getSession();
  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-header-bg backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg border border-primary/30 bg-primary/12 text-primary shadow-[0_0_14px_color-mix(in_srgb,var(--primary)_22%,transparent)]">
              <Activity className="size-4" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">Pulse Sales</span>
          </Link>
          <nav className="ml-6 hidden gap-6 md:flex">
            {["Features", "Pricing", "FAQ"].map((s) => (
              <a key={s} href={`#${s.toLowerCase()}`} className="label-caps text-muted transition-colors hover:text-accent">{s}</a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {session ? (
              <LinkButton href="/dashboard" variant="solid">Open app</LinkButton>
            ) : (
              <>
                <LinkButton href="/login" variant="secondary" className="hidden sm:inline-flex">Sign in</LinkButton>
                <LinkButton href="/signup" variant="solid">Start free</LinkButton>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-24 text-center sm:pt-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1 animate-in-down">
            <span className="size-1.5 rounded-full bg-success animate-glow" />
            <span className="label-caps text-[10px] text-success">14-day Pro trial · no card required</span>
          </span>
          <h1 className="mx-auto mt-7 max-w-4xl font-display text-5xl font-bold leading-[1.02] tracking-tight animate-in-up sm:text-7xl">
            Sales management your whole team{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-pink bg-clip-text text-transparent">actually uses</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted animate-in-up">
            Track every sale, rep and customer. Control who can see and change what. Know your numbers in real time.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3 animate-in-up">
            <LinkButton href="/signup" variant="solid" className="h-12 px-6 text-base">
              Start your free trial <ArrowRight className="size-4" />
            </LinkButton>
            <LinkButton href="/login" variant="secondary" className="h-12 px-6 text-base">Sign in</LinkButton>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20">
        <p className="label-caps text-center text-primary">Everything in one place</p>
        <h2 className="mt-2 text-center font-display text-4xl font-bold tracking-tight">Built for real sales teams</h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, code, body, tone }, i) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-[var(--shadow)] transition-[transform,box-shadow] duration-200 animate-in-up hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
              style={{ borderTop: `3px solid ${toneVar(tone)}`, animationDelay: `${i * 0.06}s` }}
            >
              <div className="scanlines pointer-events-none absolute inset-0" />
              <Icon className="relative size-7" style={{ color: toneVar(tone) }} strokeWidth={1.5} />
              <h3 className="relative mt-4 font-display text-xl font-bold">{title}</h3>
              <p className="relative mt-1 font-mono text-xs" style={{ color: toneVar(tone) }}>{code}</p>
              <p className="relative mt-3 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="scroll-mt-16 border-y border-border bg-surface-2/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="label-caps text-center text-primary">Pricing</p>
          <h2 className="mt-2 text-center font-display text-4xl font-bold tracking-tight">Simple per-seat pricing</h2>
          <p className="mt-2 text-center text-muted">Start free. Upgrade when your team grows.</p>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {DEFAULT_PLAN_LIMITS.map((p) => {
              const featured = p.plan === "pro";
              return (
                <div
                  key={p.plan}
                  className="relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border bg-surface p-8 shadow-[var(--shadow)]"
                  style={{
                    borderColor: featured ? "color-mix(in srgb, var(--primary) 45%, transparent)" : "var(--border)",
                    boxShadow: featured ? "0 0 40px color-mix(in srgb, var(--primary) 18%, transparent), var(--shadow)" : undefined,
                  }}
                >
                  {featured && <span className="label-caps absolute right-5 top-5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Popular</span>}
                  <h3 className="label-caps text-muted">{p.plan}</h3>
                  <p className="mt-3">
                    <span className={`font-display text-5xl font-bold ${featured ? "text-primary" : ""}`}>${p.pricePerSeat}</span>
                    <span className="text-muted"> / seat / mo</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                    {PLAN_FEATURES[p.plan].map((f) => (
                      <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" />{f}</li>
                    ))}
                  </ul>
                  <LinkButton href="/signup" variant={featured ? "solid" : "secondary"} className="mt-8 w-full">
                    {p.plan === "free" ? "Start free" : "Start 14-day trial"}
                  </LinkButton>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-20">
        <p className="label-caps text-center text-primary">FAQ</p>
        <h2 className="mt-2 text-center font-display text-4xl font-bold tracking-tight">Questions</h2>
        <div className="mt-10 divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-6 py-4 open:bg-primary/[0.03]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {q}
                <ChevronDown className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row">
          <span className="font-display tracking-wide">© {new Date().getFullYear()} Pulse Sales</span>
          <div className="flex gap-5">
            <a href="#pricing" className="transition-colors hover:text-accent">Pricing</a>
            <Link href="/login" className="transition-colors hover:text-accent">Sign in</Link>
            <Link href="/signup" className="transition-colors hover:text-accent">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
