import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { clsx } from "clsx";
import { buttonClass, inputClass } from "./ui";
import { cn } from "@/lib/cn";

export const PAGE_SIZE = 20;

export function pageOf(sp: Record<string, string | undefined>) {
  const page = Math.max(1, Number(sp.page) || 1);
  return { page, offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE };
}

function href(base: string, sp: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  Object.entries({ ...sp, ...patch }).forEach(([k, v]) => v && p.set(k, v));
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

export function Pagination({ base, sp, total }: { base: string; sp: Record<string, string | undefined>; total: number }) {
  const { page } = pageOf(sp);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(page * PAGE_SIZE, total);
  const btn = "grid size-8 place-items-center rounded-lg border border-border bg-surface";
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-muted">
      <span>
        {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link aria-label="Previous page" href={href(base, sp, { page: String(page - 1) })} className={clsx(btn, "hover:text-text")}>
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <span className={clsx(btn, "opacity-40")}><ChevronLeft className="size-4" /></span>
        )}
        <span className="px-2">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link aria-label="Next page" href={href(base, sp, { page: String(page + 1) })} className={clsx(btn, "hover:text-text")}>
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={clsx(btn, "opacity-40")}><ChevronRight className="size-4" /></span>
        )}
      </div>
    </div>
  );
}

/** Column header that toggles ?sort=col&dir=asc|desc. */
export function SortLink({ base, sp, col, children, className }: { base: string; sp: Record<string, string | undefined>; col: string; children: React.ReactNode; className?: string }) {
  const active = sp.sort === col;
  const dir = active && sp.dir === "asc" ? "desc" : "asc";
  return (
    <Link href={href(base, sp, { sort: col, dir, page: undefined })} className={clsx("inline-flex items-center gap-1 hover:text-text", active && "text-text", className)}>
      {children}
      {active && (sp.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
    </Link>
  );
}

/** GET form: search box plus any extra filter controls. */
export function FilterBar({ q, children, placeholder = "Search…" }: { q?: string; children?: React.ReactNode; placeholder?: string }) {
  return (
    <form className="flex flex-wrap items-center gap-2 border-b border-border p-3">
      <label className="relative min-w-48 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder={placeholder} aria-label="Search" className={cn(inputClass, "h-9 pl-9")} />
      </label>
      {children}
      <button className={cn(buttonClass("secondary"), "h-9")}>Apply</button>
    </form>
  );
}

export const filterSelect = cn(inputClass, "h-9 w-auto");
