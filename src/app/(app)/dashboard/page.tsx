import Link from "next/link";
import { ChevronRight, DollarSign, Plus, ReceiptText, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { getTenant } from "@/lib/auth";
import { kpis, parseRange, previousRange, recentSales, revenueSeries, topCustomers, topProducts, topReps } from "@/lib/queries";
import { compactMoney, date, money, pctChange } from "@/lib/format";
import { Alert, Avatar, StatusBadge, Card, CardHeader, EmptyState, LinkButton, LivePill, PageHeader, Stat, Table, Td, Th, tint, type Tone } from "@/components/ui";
import { RevenueBars, Sparkline } from "@/components/charts";
import { RangePicker } from "@/components/range-picker";
import { CountUp, LiveClock } from "@/components/live";

export const metadata = { title: "Dashboard · Pulse Sales" };

// HOPE ranks: gold, primary, accent, pink, then muted.
const RANK_TONES: Tone[] = ["gold", "primary", "accent", "pink"];
const rankColor = (i: number) => (RANK_TONES[i] ? `var(--${RANK_TONES[i]})` : "var(--muted)");

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
    topProducts(t, range, 5),
    recentSales(t),
  ]);
  const spark = series.rows.map((r) => r.revenue);
  const counts = series.rows.map((r) => r.count);
  const chart = series.rows.map((r) => ({
    label: new Date(r.bucket + "T00:00:00").toLocaleDateString("en-US", series.bucket === "month" ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" }),
    revenue: r.revenue,
  }));
  const maxProduct = prods[0]?.revenue || 1;

  return (
    <div className="relative">
      {/* HOPE ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="animate-drift absolute left-[8%] top-[10%] h-[500px] w-[600px]" style={{ background: `radial-gradient(ellipse, ${tint("primary", 5)} 0%, transparent 60%)` }} />
        <div className="animate-drift absolute bottom-[12%] right-[6%] h-[400px] w-[500px] [animation-direction:reverse]" style={{ background: `radial-gradient(ellipse, ${tint("accent", 4)} 0%, transparent 60%)` }} />
      </div>

      {sp.denied && <div className="mb-4"><Alert tone="warning">You don&apos;t have access to that page. Ask an admin to update your rights.</Alert></div>}
      <PageHeader
        title="Dashboard"
        badge={<LivePill />}
        actions={
          <>
            {t.can("SALES_VIEW") && (
              <LinkButton href="/sales" variant="primary">
                <ReceiptText className="size-4" /> Transactions
              </LinkButton>
            )}
            {t.can("REPORT_VIEW") && (
              <LinkButton href="/reports" variant="secondary">
                <TrendingUp className="size-4" /> Reports
              </LinkButton>
            )}
            {t.can("SALES_ADD") && (
              <LinkButton href="/sales/new" variant="solid">
                <Plus className="size-4" /> New sale
              </LinkButton>
            )}
          </>
        }
      />
      <div className="-mt-5 mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Welcome back, {t.user.name.split(" ")[0]} · <LiveClock /> · {t.can("SALES_VIEW_ALL") ? "All reps" : "Your sales"}
        </p>
        <RangePicker current={range.key} from={range.from} to={range.to} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={`Revenue · ${range.label}`} value={<CountUp value={k.revenue} kind="money" currency={cur} />} change={pctChange(k.revenue, kp.revenue)} icon={DollarSign} tone="primary">
          <Sparkline data={spark} />
        </Stat>
        <Stat label="Transactions" value={<CountUp value={k.count} kind="number" />} change={pctChange(k.count, kp.count)} icon={ShoppingCart} tone="accent">
          <Sparkline data={counts} />
        </Stat>
        <Stat label="Active customers" value={<CountUp value={k.customers} kind="number" />} change={pctChange(k.customers, kp.customers)} icon={Users} tone="gold" />
        <Stat label="Avg. order value" value={<CountUp value={k.avg} kind="money" currency={cur} />} change={pctChange(k.avg, kp.avg)} icon={ReceiptText} tone="pink" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="scanlines pointer-events-none absolute inset-0" />
          <CardHeader
            title={`${chart.length} ${series.bucket === "day" ? "days" : series.bucket + "s"}`}
            description="Revenue trend"
            action={t.can("REPORT_VIEW") ? <Link href="/reports" className="label-caps flex items-center gap-1 text-muted transition-colors hover:text-accent">Full report <ChevronRight className="size-3" /></Link> : undefined}
          />
          <div className="relative p-4">
            {chart.length ? <RevenueBars data={chart} currency={cur} /> : <EmptyState icon={DollarSign} title="No revenue in this period" description="Completed sales will show up here." />}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Top products" description="By revenue" />
          <div className="space-y-4 p-5">
            {prods.length === 0 && <p className="py-6 text-center text-sm text-muted">No sales yet.</p>}
            {prods.map((p, i) => (
              <div key={p.id} className="animate-in-left" style={{ animationDelay: `${0.15 + i * 0.08}s` }}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="min-w-5 font-display text-sm font-bold" style={{ color: rankColor(i) }}>#{i + 1}</span>
                    <span className="truncate text-sm font-medium">{p.name}</span>
                  </div>
                  <span className="shrink-0 font-display text-sm font-bold" style={{ color: rankColor(i) }}>{compactMoney(p.revenue, cur)}</span>
                </div>
                <div className="h-[3px] overflow-hidden rounded bg-border">
                  <div
                    className="animate-grow-x h-full rounded"
                    style={{ width: `${(p.revenue / maxProduct) * 100}%`, background: rankColor(i), boxShadow: `0 0 8px ${rankColor(i)}`, animationDelay: `${0.4 + i * 0.08}s` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader title="Recent transactions" description="Latest activity" action={<Link href="/sales" className="label-caps flex items-center gap-1 text-muted transition-colors hover:text-accent">View all <ChevronRight className="size-3" /></Link>} />
          {recent.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No sales yet"
              description="Record your first sale to start tracking revenue."
              action={t.can("SALES_ADD") ? <LinkButton href="/sales/new" variant="solid">New sale</LinkButton> : undefined}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Trans #</Th>
                  <Th>Customer</Th>
                  <Th className="hidden sm:table-cell">Rep</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s, i) => (
                  <tr key={s.id} className="animate-in-left transition-colors hover:bg-primary/[0.03]" style={{ animationDelay: `${0.05 + i * 0.04}s` }}>
                    <Td>
                      <Link href={`/sales/${s.id}`} className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary hover:bg-primary/18">
                        #{s.number}
                      </Link>
                    </Td>
                    <Td className="max-w-48 truncate font-medium">{s.customer}</Td>
                    <Td className="hidden text-muted sm:table-cell">{s.rep}</Td>
                    <Td className="text-muted">{date(s.saleDate)}</Td>
                    <Td><StatusBadge status={s.status} /></Td>
                    <Td className="tabular text-right font-bold">{money(s.total, cur)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader title="Top reps" description="Leaderboard" />
            <ul className="divide-y divide-border">
              {reps.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">No sales yet.</li>}
              {reps.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-6 font-display text-sm font-bold" style={{ color: rankColor(i) }}>#{i + 1}</span>
                  <Avatar name={r.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted">{r.count} sales</p>
                  </div>
                  <span className="tabular font-display text-sm font-bold" style={{ color: rankColor(i) }}>{compactMoney(r.revenue, cur)}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title="Top customers" description="By revenue" />
            <ul className="divide-y divide-border">
              {custs.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">No customers in this period.</li>}
              {custs.map((c) => (
                <li key={c.id}>
                  <Link href={`/customers/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-primary/[0.03]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted">{c.count} orders</p>
                    </div>
                    <span className="tabular font-display text-sm font-bold">{money(c.revenue, cur)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
