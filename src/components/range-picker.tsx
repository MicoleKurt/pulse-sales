"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";

const OPTIONS = [
  ["7d", "7D"],
  ["30d", "30D"],
  ["90d", "90D"],
  ["ytd", "YTD"],
  ["12m", "12M"],
] as const;

export function RangePicker({ current, from, to }: { current: string; from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const go = (next: Record<string, string>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => p.set(k, v));
    if (next.range && next.range !== "custom") {
      p.delete("from");
      p.delete("to");
    }
    router.push(`${pathname}?${p}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
        {OPTIONS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => go({ range: key })}
            className={clsx("rounded-md px-2.5 py-1 text-xs font-medium transition", current === key ? "bg-primary text-primary-fg" : "text-muted hover:text-text")}
          >
            {label}
          </button>
        ))}
      </div>
      <form
        className="flex items-center gap-1 text-xs"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          go({ range: "custom", from: String(f.get("from")), to: String(f.get("to")) });
        }}
      >
        <input name="from" type="date" defaultValue={from} aria-label="From" className="h-8 rounded-lg border border-border bg-surface px-2 text-text" />
        <span className="text-muted">–</span>
        <input name="to" type="date" defaultValue={to} aria-label="To" className="h-8 rounded-lg border border-border bg-surface px-2 text-text" />
        <button className="h-8 rounded-lg border border-border bg-surface px-2 font-medium hover:bg-surface-2">Apply</button>
      </form>
    </div>
  );
}
