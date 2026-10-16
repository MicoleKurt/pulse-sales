import Link from "next/link";
import { Activity } from "lucide-react";
import { FloatingPaths } from "@/components/floating-paths";

// HopeSMS sign-in layout: floating-paths backdrop, brand + role cards on the left, glass form card on the right.
const ROLES = [
  { role: "Owner", desc: "Full control, billing and the rights matrix", color: "var(--gold)" },
  { role: "Admin", desc: "Team, rights, deletes and the audit log", color: "var(--primary)" },
  { role: "Manager", desc: "Every rep's sales, reports and exports", color: "var(--accent)" },
  { role: "Sales rep", desc: "Their own sales, customers and products", color: "var(--pink)" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh overflow-hidden bg-bg lg:grid-cols-[1.1fr_1fr]">
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />

      <div className="relative hidden flex-col justify-between p-10 lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg border border-primary/30 bg-primary/12 text-primary shadow-[0_0_14px_color-mix(in_srgb,var(--primary)_22%,transparent)]">
            <Activity className="size-4" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">Pulse Sales</span>
        </Link>

        <div className="max-w-lg animate-in-up">
          <p className="label-caps text-primary">Sales command center</p>
          <h2 className="mt-3 font-display text-5xl font-bold leading-[1.05] tracking-tight">
            Every sale, every rep,{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-pink bg-clip-text text-transparent">every number.</span>
          </h2>
          <p className="mt-4 text-muted">Track transactions, manage your team&apos;s permissions and see revenue in real time.</p>

          <div className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface/70 p-5 backdrop-blur">
            <p className="label-caps text-muted">Role-based access</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {ROLES.map((r) => (
                <div key={r.role} className="rounded-xl border px-3 py-2.5" style={{ borderColor: `color-mix(in srgb, ${r.color} 18%, transparent)`, background: `color-mix(in srgb, ${r.color} 4%, transparent)` }}>
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full" style={{ background: r.color, boxShadow: `0 0 6px ${r.color}` }} />
                    <span className="font-display text-sm font-bold tracking-[0.04em]" style={{ color: r.color }}>{r.role}</span>
                  </div>
                  <p className="mt-0.5 pl-3.5 text-xs text-muted">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-sm text-faint">© {new Date().getFullYear()} Pulse Sales</p>
      </div>

      <div className="relative flex items-center justify-center px-4 py-12">
        <div
          className="w-full max-w-sm rounded-[var(--radius-card)] border border-border bg-surface/80 p-7 shadow-[var(--shadow-lift)] backdrop-blur animate-in-up"
          style={{ borderTop: "2px solid var(--primary)" }}
        >
          <Link href="/" className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="grid size-8 place-items-center rounded-lg border border-primary/30 bg-primary/12 text-primary">
              <Activity className="size-4" />
            </span>
            <span className="font-display text-lg font-bold">Pulse Sales</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
