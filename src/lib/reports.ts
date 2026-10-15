import "server-only";
import type { Tenant } from "./auth";
import { kpis, revenueSeries, topCustomers, topProducts, topReps, type Range } from "./queries";

export const REPORT_TABS = [
  { key: "period", label: "By period", advanced: false },
  { key: "rep", label: "By rep", advanced: false },
  { key: "product", label: "By product", advanced: true },
  { key: "customer", label: "By customer", advanced: true },
] as const;
export type ReportTab = (typeof REPORT_TABS)[number]["key"];

export type ReportRow = { label: string; count: number; revenue: number; extra?: string };

export async function buildReport(t: Tenant, tab: ReportTab, range: Range) {
  const summary = await kpis(t, range);
  let rows: ReportRow[] = [];
  if (tab === "period") {
    const s = await revenueSeries(t, range);
    rows = s.rows.map((r) => ({ label: r.bucket, count: r.count, revenue: r.revenue }));
  } else if (tab === "rep") {
    rows = (await topReps(t, range, 500)).map((r) => ({ label: r.name, count: r.count, revenue: r.revenue }));
  } else if (tab === "product") {
    rows = (await topProducts(t, range, 500)).map((r) => ({ label: r.name, count: r.quantity, revenue: r.revenue, extra: r.sku }));
  } else {
    rows = (await topCustomers(t, range, 500)).map((r) => ({ label: r.name, count: r.count, revenue: r.revenue }));
  }
  return { summary, rows };
}

export const countLabel = (tab: ReportTab) => (tab === "product" ? "Qty sold" : "Sales");
