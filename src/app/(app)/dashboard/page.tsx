import Link from "next/link";
import { DollarSign, Package, Plus, ReceiptText, ShoppingCart } from "lucide-react";
import { getTenant } from "@/lib/auth";
import { kpis, parseRange, previousRange, recentSales, revenueSeries, topCustomers, topProducts, topReps } from "@/lib/queries";
import { date, money, num, pctChange } from "@/lib/format";
import { Alert, Avatar, StatusBadge, Card, CardHeader, EmptyState, LinkButton, PageHeader, Stat, Table, Td, Th } from "@/components/ui";
import { RevenueChart, Sparkline } from "@/components/charts";
import { RangePicker } from "@/components/range-picker";

export const metadata = { title: "Dashboard · Pulse Sales" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const t = await getTenant();
  const range = parseRange(sp);
  const prev = previousRange(range);
  const cur = t.org.currency;

  const [k, kp, series, reps, custs, prods, recent] = await Promise.all([
    kpis(t, range),
    kpis(t, prev),
    revenueSeries(t, range),
    topReps(t, range),
    topCustomers(t, range),
    topProducts(t, range, 1),
    recentSales(t),
  ]);
  const spark = series.rows.map((r) => r.revenue);
  const counts = series.rows.map((r) => r.count);
  const chart = series.rows.map((r) => ({
    label: new Date(r.bucket + "T00:00:00").toLocaleDateString("en-US", series.bucket === "month" ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" }),
    revenue: r.revenue,
  }));
  const topProduct = prods[0];

  return (
    <>
      {sp.denied && <div className="mb-4"><Alert tone="warning">You don&apos;t have access to that page. Ask an admin to update your rights.</Alert></div>}
      <PageHeader
        title={`Good ${greeting()}, ${t.user.name.split(" ")[0]}`}
        description={`${range.label} · ${t.can("SALES_VIEW_ALL") ? "All reps" : "Your sales"}`}
        actions={
          <>
            <RangePicker current={range.key} from={range.from} to={range.to} />
            {t.can("SALES_ADD") && (
              <LinkButton href="/sales/new">
                <Plus className="size-4" /> New sale
              </LinkButton>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue" value={money(k.revenue, cur)} change={pctChange(k.revenue, kp.revenue)} icon={DollarSign}>
          <Sparkline data={spark} />
        </Stat>
        <Stat label="Sales" value={num(k.count)} change={pctChange(k.count, kp.count)} icon={ShoppingCart}>
          <Sparkline data={counts} />
        </Stat>
        <Stat label="Avg. order value" value={money(k.avg, cur)} change={pctChange(k.avg, kp.avg)} icon={ReceiptText} />
        <Stat label="Top product" value={topProduct?.name ?? "—"} icon={Package}>
          {topProduct && <span className="text-xs text-muted">{money(topProduct.revenue, cur)}</span>}
        </Stat>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Revenue trend" description={`Completed sales, grouped by ${series.bucket}`} />
          <div className="p-4">
            {chart.length ? <RevenueChart data={chart} currency={cur} /> : <EmptyState icon={DollarSign} title="No revenue in this period" description="Completed sales will show up here." />}
          </div>
        </Card>
        <Card>
          <CardHeader title="Top reps" description="By revenue" />
          <ul className="divide-y divide-border">
            {reps.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">No sales yet.</li>}
            {reps.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-4 text-xs text-muted">{i + 1}</span>
                <Avatar name={r.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted">{r.count} sales</p>
                </div>
                <span className="tabular text-sm font-medium">{money(r.revenue, cur)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Recent sales" action={<Link href="/sales" className="text-xs font-medium text-primary hover:underline">View all</Link>} />
          {recent.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No sales yet"
              description="Record your first sale to start tracking revenue."
              action={t.can("SALES_ADD") ? <LinkButton href="/sales/new">New sale</LinkButton> : undefined}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Customer</Th>
                  <Th className="hidden sm:table-cell">Rep</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-2/50">
                    <Td><Link href={`/sales/${s.id}`} className="font-medium text-primary hover:underline">#{s.number}</Link></Td>
                    <Td className="max-w-48 truncate">{s.customer}</Td>
                    <Td className="hidden text-muted sm:table-cell">{s.rep}</Td>
                    <Td className="text-muted">{date(s.saleDate)}</Td>
                    <Td><StatusBadge status={s.status} /></Td>
                    <Td className="tabular text-right font-medium">{money(s.total, cur)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title="Top customers" description="By revenue" />
          <ul className="divide-y divide-border">
            {custs.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">No customers in this period.</li>}
            {custs.map((c) => (
              <li key={c.id}>
                <Link href={`/customers/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2/50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted">{c.count} orders</p>
                  </div>
                  <span className="tabular text-sm font-medium">{money(c.revenue, cur)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}
