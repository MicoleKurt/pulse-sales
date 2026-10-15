import Link from "next/link";
import { desc } from "drizzle-orm";
import { Building2, DollarSign, Percent, TrendingDown, TrendingUp, UserPlus, Users, Wallet } from "lucide-react";
import { db, schema } from "@/db";
import { mrrByPlan, platformMetrics, revenueByMonth, signupsByMonth } from "@/lib/platform";
import { date, money, num, pctChange } from "@/lib/format";
import { Badge, Card, CardHeader, PageHeader, Stat, Table, Td, Th } from "@/components/ui";
import { BarList, RevenueChart } from "@/components/charts";
import { SignupsChart } from "./signups-chart";

export default async function AdminOverview() {
  const [m, signups, byPlan, revenue, newest] = await Promise.all([
    platformMetrics(),
    signupsByMonth(),
    mrrByPlan(),
    revenueByMonth(),
    db
      .select({ id: schema.organizations.id, name: schema.organizations.name, plan: schema.organizations.plan, createdAt: schema.organizations.createdAt, status: schema.organizations.status })
      .from(schema.organizations)
      .orderBy(desc(schema.organizations.createdAt))
      .limit(6),
  ]);

  return (
    <>
      <PageHeader title="Overview" description="How the business is doing across every workspace." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="MRR" value={money(m.mrr)} icon={DollarSign} />
        <Stat label="ARR" value={money(m.arr)} icon={Wallet} />
        <Stat label="Active orgs" value={num(m.activeOrgs)} icon={Building2}>
          <span className="text-xs text-muted">{m.paying} paying · {m.trialing} trialing</span>
        </Stat>
        <Stat label="New signups (30d)" value={num(m.signups30)} change={pctChange(m.signups30, m.signupsPrev30)} icon={UserPlus} />
        <Stat label="Trial → paid" value={`${m.conversion.toFixed(1)}%`} icon={TrendingUp} />
        <Stat label="Churn (30d)" value={`${m.churnRate.toFixed(1)}%`} icon={TrendingDown} />
        <Stat label="ARPU" value={money(m.arpu)} icon={Percent} />
        <Stat label="Total users" value={num(m.users)} icon={Users}>
          {m.suspended > 0 && <Badge tone="danger">{m.suspended} suspended</Badge>}
        </Stat>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Collected revenue" description="Paid invoices per month" />
          <div className="p-4"><RevenueChart data={revenue.map((r) => ({ label: r.month, revenue: r.revenue }))} currency="USD" /></div>
        </Card>
        <Card>
          <CardHeader title="MRR by plan" />
          <div className="p-4"><BarList data={byPlan.map((p) => ({ label: `${p.plan} (${p.orgs})`, value: p.mrr }))} currency="USD" height={200} /></div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Signups" description="Users and organizations created per month" />
          <div className="p-4"><SignupsChart data={signups} /></div>
        </Card>
        <Card>
          <CardHeader title="Newest workspaces" action={<Link href="/admin/organizations" className="text-xs font-medium text-primary hover:underline">All</Link>} />
          <Table>
            <tbody>
              {newest.map((o) => (
                <tr key={o.id}>
                  <Td><Link href={`/admin/organizations/${o.id}`} className="font-medium text-primary hover:underline">{o.name}</Link><p className="text-xs text-muted">{date(o.createdAt)}</p></Td>
                  <Td className="text-right"><Badge tone={o.plan === "free" ? "neutral" : "primary"}>{o.plan}</Badge></Td>
                </tr>
              ))}
              {newest.length === 0 && <tr><Th className="py-8 text-center">No workspaces yet.</Th></tr>}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
