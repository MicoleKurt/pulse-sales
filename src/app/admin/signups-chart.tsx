"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SignupsChart({ data }: { data: { month: string; users: number; orgs: number }[] }) {
  const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false, axisLine: false };
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" {...axis} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="users" name="Users" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="orgs" name="Organizations" fill="var(--accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
