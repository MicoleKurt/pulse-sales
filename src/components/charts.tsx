"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// HOPE chart styling: Rajdhani ticks, faint dashed grid, dark elevated tooltip with a glowing value.
const axis = {
  stroke: "var(--muted)",
  tick: { fill: "var(--muted)", fontSize: 11, fontFamily: "var(--font-display)" },
  tickLine: false,
  axisLine: false,
};
const tooltipStyle = {
  contentStyle: {
    background: "var(--surface-3)",
    border: "1px solid var(--border-strong)",
    borderRadius: 8,
    boxShadow: "var(--shadow-lift)",
    fontSize: 12,
    color: "var(--text)",
  },
  labelStyle: { color: "var(--muted)", fontFamily: "var(--font-display)", letterSpacing: "0.06em" },
  itemStyle: { color: "var(--primary)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 },
};
const fmt = (currency: string) => (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(v);

export function RevenueChart({ data, currency, height = 280 }: { data: { label: string; revenue: number }[]; currency: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" {...axis} minTickGap={24} />
        <YAxis {...axis} tickFormatter={fmt(currency)} width={60} />
        <Tooltip {...tooltipStyle} formatter={(v) => [fmt(currency)(Number(v)), "Revenue"]} />
        <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} fill="url(#rev)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** HOPE's dashboard trend: rounded violet columns with a faint hover band. */
export function RevenueBars({ data, currency, height = 240 }: { data: { label: string; revenue: number }[]; currency: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="bars" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" {...axis} minTickGap={12} />
        <YAxis {...axis} tickFormatter={fmt(currency)} width={56} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "color-mix(in srgb, var(--primary) 6%, transparent)" }} formatter={(v) => [fmt(currency)(Number(v)), "Revenue"]} />
        <Bar dataKey="revenue" fill="url(#bars)" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BarList({ data, currency, height = 260, color = "var(--accent)" }: { data: { label: string; value: number }[]; currency: string; height?: number; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" {...axis} tickFormatter={fmt(currency)} />
        <YAxis type="category" dataKey="label" {...axis} width={110} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-2)" }} formatter={(v) => [fmt(currency)(Number(v)), "Revenue"]} />
        <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const PIE = ["var(--primary)", "var(--accent)", "var(--warning)", "var(--success)", "var(--danger)", "var(--muted)"];

export function Donut({ data, currency }: { data: { label: string; value: number }[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={60} outerRadius={95} paddingAngle={2} stroke="var(--surface)">
          {data.map((_, i) => (
            <Cell key={i} fill={PIE[i % PIE.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(v, n) => [fmt(currency)(Number(v)), String(n)]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data }: { data: number[] }) {
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.map((v, i) => ({ i, v }))}>
          <Area type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={1.5} fill="var(--accent)" fillOpacity={0.12} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
