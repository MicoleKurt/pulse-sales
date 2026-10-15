"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const TABS = [
  ["/settings", "General"],
  ["/settings/billing", "Billing & plan"],
] as const;

export function SettingsTabs() {
  const path = usePathname();
  return (
    <div className="mb-4 flex gap-1 border-b border-border">
      {TABS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={clsx("-mb-px border-b-2 px-3 py-2 text-sm font-medium", path === href ? "border-primary text-primary" : "border-transparent text-muted hover:text-text")}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
