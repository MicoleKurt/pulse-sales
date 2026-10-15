import Link from "next/link";
import { BarChart3, DollarSign, Lock, ReceiptText, ShoppingCart, Users } from "lucide-react";
import { clsx } from "clsx";
import { requirePage } from "@/lib/auth";
import { parseRange } from "@/lib/queries";
import { REPORT_TABS, buildReport, countLabel, type ReportTab } from "@/lib/reports";
import { getLimits } from "@/lib/services";
import { money, num } from "@/lib/format";
import { Card, CardHeader, EmptyState, LinkButton, PageHeader, Stat, Table, Td, Th } from "@/components/ui";
import { BarList, Donut, RevenueChart } from "@/components/charts";
import { RangePicker } from "@/components/range-picker";
import { ReportPdfButton } from "./report-pdf";

export const metadata = { title: "Reports · Pulse Sales" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const t = await requirePage("REPORT_VIEW");
  const range = parseRange(sp);
  const tab = (REPORT_TABS.find((x) => x.key === sp.tab)?.key ?? "period") as ReportTab;
  const limits = await getLimits(t.plan);
  const locked = REPORT_TABS.find((x) => x.key === tab)!.advanced && !limits.advancedReports;
  const cur = t.org.currency;

  const { summary, rows } = locked ? { summary: null, rows: [] } : await buildReport(t, tab, range);
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    Object.entries(patch).forEach(([k, v]) => p.set(k, v));
    return p.toString();
  };
  const tabLabel = REPORT_TABS.find((x) => x.key === tab)!.label;

  return (
    <>
      <PageHeader
        title="Reports"
        description={`${tabLabel} · ${range.label}`}
        actions={
          <>
            <RangePicker current={range.key} from={range.from} to={range.to} />
            {t.can("EXPORT") && limits.exports && !locked && (
              <>
                <a href={`/api/export/report?${qs({ format: "xlsx" })}`} className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-2">
                  XLSX
                </a>
                <a href={`/api/export/report?${qs({ format: "csv" })}`} className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-2">
                  CSV
                </a>
                <ReportPdfButton org={t.org.name} title={`${tabLabel} · ${range.label}`} currency={cur} countLabel={countLabel(tab)} rows={rows} />
              </>
            )}
          </>
        }
      />

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
        {REPORT_TABS.map((x) => (
          <Link
            key={x.key}
            href={`/reports?${qs({ tab: x.key })}`}
            className={clsx(
              "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
              tab === x.key ? "border-primary text-primary" : "border-transparent text-muted hover:text-text",
            )}
          >
            {x.label}
            {x.advanced && !limits.advancedReports && <Lock className="size-3" />}
          </Link>
        ))}
      </div>

      {locked ? (
        <Card>
          <EmptyState
            icon={Lock}
            title="Advanced reports are on Business"
            description="Break down revenue by product and customer with the Business plan."
            action={t.can("BILLING_ADMIN") ? <LinkButton href="/settings/billing">See plans</LinkButton> : undefined}
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Revenue" value={money(summary!.revenue, cur)} icon={DollarSign} />
            <Stat label="Sales" value={num(summary!.count)} icon={ShoppingCart} />
            <Stat label="Avg. order" value={money(summary!.avg, cur)} icon={ReceiptText} />
            <Stat label="Customers" value={num(summary!.customers)} icon={Users} />
          </div>

          {rows.length === 0 ? (
            <Card className="mt-4">
              <EmptyState icon={BarChart3} title="No data in this period" description="Pick a wider date range." />
            </Card>
          ) : (
            <div className="mt-4 grid gap-4 xl:grid-cols-5">
              <Card className="xl:col-span-3">
                <CardHeader title="Revenue" />
                <div className="p-4">
                  {tab === "period" ? (
                    <RevenueChart data={rows.map((r) => ({ label: r.label, revenue: r.revenue }))} currency={cur} />
                  ) : (
                    <BarList data={rows.slice(0, 10).map((r) => ({ label: r.label, value: r.revenue }))} currency={cur} height={Math.max(200, Math.min(10, rows.length) * 36)} />
                  )}
                </div>
              </Card>
              <Card className="xl:col-span-2">
                <CardHeader title="Share of revenue" description="Top 5 + other" />
                <div className="p-4">
                  <Donut
                    currency={cur}
                    data={[
                      ...rows
                        .slice()
                        .sort((a, b) => b.revenue - a.revenue)
                        .slice(0, 5)
                        .map((r) => ({ label: r.label, value: r.revenue })),
                      ...(rows.length > 5 ? [{ label: "Other", value: rows.slice().sort((a, b) => b.revenue - a.revenue).slice(5).reduce((s, r) => s + r.revenue, 0) }] : []),
                    ]}
                  />
                </div>
              </Card>
              <Card className="xl:col-span-5">
                <Table>
                  <thead>
                    <tr>
                      <Th>{tab === "period" ? "Period" : tabLabel.replace("By ", "").replace(/^./, (c) => c.toUpperCase())}</Th>
                      <Th className="text-right">{countLabel(tab)}</Th>
                      <Th className="text-right">Revenue</Th>
                      <Th className="text-right">Share</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.label + (r.extra ?? "")}>
                        <Td className="font-medium">
                          {r.label} {r.extra && <span className="ml-1 font-mono text-xs text-muted">{r.extra}</span>}
                        </Td>
                        <Td className="tabular text-right">{num(r.count)}</Td>
                        <Td className="tabular text-right font-medium">{money(r.revenue, cur)}</Td>
                        <Td className="tabular text-right text-muted">{summary!.revenue ? ((r.revenue / summary!.revenue) * 100).toFixed(1) : 0}%</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            </div>
          )}
        </>
      )}
    </>
  );
}
