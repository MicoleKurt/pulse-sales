import Link from "next/link";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export const buttonClass = (variant: Variant = "primary", size: "sm" | "md" = "md") =>
  clsx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
    variant === "primary" && "bg-primary text-primary-fg hover:brightness-110",
    variant === "secondary" && "border border-border bg-surface text-text hover:bg-surface-2",
    variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-text",
    variant === "danger" && "bg-danger text-white hover:brightness-110",
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
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-muted outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15 disabled:opacity-60";

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
      <span className="text-sm font-medium">{label}</span>
      {children}
      {msg ? <span className="block text-xs text-danger">{msg}</span> : hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={clsx("rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow)]", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const badgeTones = {
  neutral: "bg-surface-2 text-muted",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/12 text-danger",
  accent: "bg-accent/12 text-accent",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeTones; children: React.ReactNode }) {
  return <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize", badgeTones[tone])}>{children}</span>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
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
  <th {...p} className={clsx("whitespace-nowrap border-b border-border bg-surface-2/60 px-4 py-2.5 text-xs font-medium text-muted", className)} />
);
export const Td = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td {...p} className={clsx("whitespace-nowrap border-b border-border px-4 py-3", className)} />
);

export function Stat({ label, value, change, icon: Icon, children }: { label: string; value: string; change?: number; icon: LucideIcon; children?: React.ReactNode }) {
  const up = (change ?? 0) >= 0;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="tabular mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
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
    </Card>
  );
}

export function Alert({ tone = "danger", children }: { tone?: "danger" | "success" | "warning" | "primary"; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={clsx(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "danger" && "border-danger/30 bg-danger/8 text-danger",
        tone === "success" && "border-success/30 bg-success/8 text-success",
        tone === "warning" && "border-warning/30 bg-warning/10 text-warning",
        tone === "primary" && "border-primary/30 bg-primary/8 text-primary",
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
    <span className={clsx("grid shrink-0 place-items-center rounded-full bg-primary/12 font-medium text-primary", size === "sm" ? "size-7 text-[11px]" : "size-9 text-sm")}>
      {letters}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={status === "completed" ? "success" : status === "draft" ? "warning" : "danger"}>{status}</Badge>;
}
