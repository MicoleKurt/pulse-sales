"use client";

import { useEffect, useState } from "react";

/** HOPE-style count-up for KPI figures (ease-out quart). Renders the final value on the server. */
export function CountUp({ value, kind, currency = "USD", duration = 1600 }: { value: number; kind: "money" | "number"; currency?: string; duration?: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    // Skip the effect where frames may never arrive (background tabs) or motion is unwanted.
    if (!value || document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setShown(value * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame((now) => {
      setShown(0);
      tick(now);
    });
    // Always land on the real number, even if frames are throttled mid-animation.
    const settle = setTimeout(() => setShown(value), duration + 250);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [value, duration]);

  const text =
    kind === "money"
      ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(shown)
      : Math.round(shown).toLocaleString("en-US");
  return <span suppressHydrationWarning>{text}</span>;
}

/** Live date + 24h clock shown under the dashboard title. */
export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <span className="opacity-0">--</span>;
  return (
    <span>
      {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} —{" "}
      <span className="tabular font-display tracking-[0.05em] text-faint">{now.toLocaleTimeString("en-US", { hour12: false })}</span>
    </span>
  );
}
