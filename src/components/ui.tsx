import Link from "next/link";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/*
 * Shared primitives in HopeSMS's visual language: tinted "neon" buttons with a soft glow on hover,
 * Rajdhani display type for headings/labels, glass-dark cards with scanlines and corner glows.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "solid";
export type Tone = "primary" | "accent" | "pink" | "gold" | "success" | "danger";

const toneVar: Record<Tone, string> = {
  primary: "var(--primary)",
  accent: "var(--accent)",
  pink: "var(--pink)",
  gold: "var(--gold)",
  success: "var(--success)",
  danger: "var(--danger)",
};
const toneText: Record<Tone, string> = {
  primary: "text-primary",
  accent: "text-accent",
  pink: "text-pink",
  gold: "text-gold",
  success: "text-success",
  danger: "text-danger",
};
export const tint = (tone: Tone, pct: number) => `color-mix(in srgb, ${toneVar[tone]} ${pct}%, transparent)`;

export const buttonClass = (variant: Variant = "primary", size: "sm" | "md" = "md") =>
  clsx(
    "inline-flex items-center justify-center gap-2 rounded-lg border font-display font-bold tracking-[0.04em] transition-[background-color,box-shadow,border-color,color,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
    variant === "primary" &&
      "border-primary/30 bg-primary/10 text-primary hover:border-primary/50 hover:bg-primary/18 hover:shadow-[0_0_18px_color-mix(in_srgb,var(--primary)_22%,transparent)]",
    variant === "solid" && "border-transparent bg-primary text-primary-fg hover:shadow-[0_0_22px_color-mix(in_srgb,var(--primary)_40%,transparent)]",
    variant === "secondary" && "border-border-strong bg-transparent text-muted hover:border-accent/40 hover:bg-accent/8 hover:text-accent",
    variant === "ghost" && "border-transparent text-muted hover:bg-surface-2 hover:text-text",
    variant === "danger" && "border-danger/25 bg-danger/8 text-danger hover:border-danger/45 hover:bg-danger/15",
  );

export function Button({
  variant,
  size,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return <button {...props} className={clsx(buttonClass(variant, size), className)} />;
}

export function LinkButton({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: "sm" | "md" }) {
  return <Link {...props} className={clsx(buttonClass(variant, size), className)} />;
}

export const inputClass =
  "h-10 w-full rounded-lg border border-border-strong bg-input px-3 text-sm text-text placeholder:text-faint outline-none transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_14%,transparent)] disabled:opacity-60";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(inputClass, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(inputClass, "pr-8", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(inputClass, "h-auto min-h-24 py-2", props.className)} />;
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name?: string;
  error?: string[] | string;
  hint?: string;
  children: React.ReactNode;
}) {
  const msg = Array.isArray(error) ? error[0] : error;
  return (
    <label className="block space-y-1.5" htmlFor={name}>
      <span className="label-caps text-muted">{label}</span>
      {children}
      {msg ? <span className="block text-xs text-danger">{msg}</span> : hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={clsx("relative rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow)] animate-in-up", className)}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div>
        {description && <p className="label-caps mb-0.5 text-muted">{description}</p>}
        <h3 className="font-display text-base font-bold tracking-tight">{title}</h3>
      </div>
      {action}
    </div>
  );
}

const badgeTones = {
  neutral: "border-border-strong bg-surface-2 text-muted",
  primary: "border-primary/25 bg-primary/10 text-primary",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-danger/25 bg-danger/10 text-danger",
  accent: "border-accent/25 bg-accent/10 text-accent",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeTones; children: React.ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full border px-2 py-0.5 font-display text-xs font-bold capitalize tracking-[0.05em]", badgeTones[tone])}>
      {children}
    </span>
  );
}

export function PageHeader({ title, description, actions, badge }: { title: string; description?: string; actions?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-3 animate-in-down sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="font-display text-3xl font-bold leading-none tracking-tight">{title}</h2>
          {badge}
        </div>
        {description && <p className="mt-2 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** HOPE's pulsing "LIVE" pill. */
export function LivePill({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-0.5">
      <span className="size-1.5 rounded-full bg-success animate-glow" />
      <span className="font-display text-[10px] font-bold tracking-[0.1em] text-success">{label}</span>
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-[0_0_24px_color-mix(in_srgb,var(--primary)_18%,transparent)]">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}
export const Th = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th {...p} className={clsx("label-caps whitespace-nowrap border-b border-border bg-surface-2 px-5 py-3 text-muted", className)} />
);
export const Td = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td {...p} className={clsx("whitespace-nowrap border-b border-border px-5 py-3.5", className)} />
);

/** HOPE KPI card: coloured top edge, corner glow, faded icon, big Rajdhani figure, caps label. */
export function Stat({
  label,
  value,
  change,
  icon: Icon,
  tone = "primary",
  children,
}: {
  label: string;
  value: React.ReactNode;
  change?: number;
  icon: LucideIcon;
  tone?: Tone;
  children?: React.ReactNode;
}) {
  const up = (change ?? 0) >= 0;
  return (
    <div
      className="group relative overflow-hidden rounded-[var(--radius-card)] border bg-surface px-5 pb-5 pt-6 shadow-[var(--shadow)] transition-[transform,box-shadow] duration-200 animate-in-up hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
      style={{ borderColor: tint(tone, 12), borderTop: `2px solid ${toneVar[tone]}` }}
    >
      <div className="scanlines pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute right-0 top-0 size-28" style={{ background: `radial-gradient(circle at 100% 0%, ${tint(tone, 14)}, transparent 70%)` }} />
      <Icon className={clsx("absolute right-4 top-4 size-7 opacity-25 transition-opacity duration-200 group-hover:opacity-50", toneText[tone])} strokeWidth={1.5} />
      <div className="relative">
        <p className={clsx("tabular truncate pr-8 font-display text-[2rem] font-bold leading-none tracking-tight", toneText[tone])}>{value}</p>
        <p className="label-caps mt-2 text-muted">{label}</p>
        <div className="mt-2 flex min-h-5 items-center justify-between gap-2">
          {change !== undefined ? (
            <span className={clsx("inline-flex items-center gap-0.5 text-xs font-medium", up ? "text-success" : "text-danger")}>
              {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(change).toFixed(1)}% <span className="font-normal text-muted">vs prev.</span>
            </span>
          ) : (
            <span />
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export function Alert({ tone = "danger", children }: { tone?: "danger" | "success" | "warning" | "primary"; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={clsx(
        "rounded-xl border px-4 py-3 text-sm font-medium",
        tone === "danger" && "border-danger/25 bg-danger/8 text-danger",
        tone === "success" && "border-success/25 bg-success/8 text-success",
        tone === "warning" && "border-warning/25 bg-warning/10 text-warning",
        tone === "primary" && "border-primary/25 bg-primary/8 text-primary",
      )}
    >
      {children}
    </div>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span
      className={clsx(
        "grid shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 font-display font-bold text-primary",
        size === "sm" ? "size-7 text-[10px]" : "size-9 text-xs",
      )}
    >
      {letters}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={status === "completed" ? "success" : status === "draft" ? "warning" : "danger"}>{status}</Badge>;
}
