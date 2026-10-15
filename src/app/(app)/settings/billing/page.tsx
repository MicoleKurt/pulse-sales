import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import { Check } from "lucide-react";
import { clsx } from "clsx";
import { db, schema } from "@/db";
import { getTenant } from "@/lib/auth";
import { activeSeats, billingProvider } from "@/lib/billing";
import { date, money } from "@/lib/format";
import { PLAN_FEATURES } from "@/lib/plans";
import { Alert, Badge, Card, CardHeader, Table, Td, Th } from "@/components/ui";
import { PlanButton } from "../forms";
import { openPortal } from "../actions";

export const metadata = { title: "Billing · Pulse Sales" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams;
  const t = await getTenant();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [[sub], limits, invoices, seats, [{ n: salesThisMonth }]] = await Promise.all([
    db.select().from(schema.subscriptions).where(eq(schema.subscriptions.organizationId, t.org.id)),
    db.select().from(schema.planLimits),
    db.select().from(schema.invoices).where(eq(schema.invoices.organizationId, t.org.id)).orderBy(desc(schema.invoices.createdAt)).limit(12),
    activeSeats(t.org.id),
    db
      .select({ n: count() })
      .from(schema.sales)
      .where(and(eq(schema.sales.organizationId, t.org.id), isNull(schema.sales.deletedAt), gte(schema.sales.createdAt, monthStart))),
  ]);
  const provider = billingProvider().name;
  const current = limits.find((l) => l.plan === t.plan);
  const canManage = t.can("BILLING_ADMIN") && !t.impersonating;
  const trialing = t.org.plan === "free" && t.org.trialEndsAt && t.org.trialEndsAt > new Date();
  const order = ["free", "pro", "business"] as const;

  return (
    <div className="space-y-4">
      {checkout === "success" && <Alert tone="success">Payment received. Your plan will update in a moment.</Alert>}
      {checkout === "cancel" && <Alert tone="warning">Checkout canceled. No changes were made.</Alert>}
      {sub?.status === "past_due" && <Alert>Your last payment failed. Update your payment method to keep your plan.</Alert>}
      {provider === "local" && (
        <Alert tone="primary">Local billing mode: plan changes apply instantly and are recorded as paid invoices. Add Stripe keys to .env.local to use real checkout.</Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">Current plan</p>
          <p className="mt-1 text-2xl font-semibold capitalize">{t.plan}</p>
          <p className="mt-1 text-xs text-muted">
            {trialing ? `Pro trial ends ${date(t.org.trialEndsAt)}` : sub?.currentPeriodEnd ? `Renews ${date(sub.currentPeriodEnd)}` : "No renewal"}
            {sub && <Badge tone={sub.status === "active" ? "success" : sub.status === "past_due" ? "danger" : "neutral"}>{sub.status}</Badge>}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Seats in use</p>
          <p className="tabular mt-1 text-2xl font-semibold">{seats}{current?.maxSeats ? <span className="text-base text-muted"> / {current.maxSeats}</span> : ""}</p>
          <Meter value={seats} max={current?.maxSeats} />
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Sales this month</p>
          <p className="tabular mt-1 text-2xl font-semibold">{salesThisMonth}{current?.maxSalesPerMonth ? <span className="text-base text-muted"> / {current.maxSalesPerMonth}</span> : ""}</p>
          <Meter value={salesThisMonth} max={current?.maxSalesPerMonth} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {order.map((plan) => {
          const l = limits.find((x) => x.plan === plan);
          const isCurrent = t.org.plan === plan && !trialing;
          return (
            <Card key={plan} className={clsx("flex flex-col p-6", plan === "pro" && "ring-2 ring-primary")}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold capitalize">{plan}</h3>
                {plan === "pro" && <Badge tone="primary">Popular</Badge>}
              </div>
              <p className="mt-2">
                <span className="text-3xl font-semibold">{money(l?.pricePerSeat ?? 0, "USD").replace(".00", "")}</span>
                <span className="text-sm text-muted"> / seat / month</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {PLAN_FEATURES[plan].map((f) => (
                  <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" />{f}</li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <p className="rounded-lg bg-surface-2 py-2.5 text-center text-sm font-medium text-muted">Current plan</p>
                ) : canManage ? (
                  <PlanButton plan={plan} label={plan === "free" ? "Downgrade to Free" : `Switch to ${plan[0]!.toUpperCase() + plan.slice(1)}`} variant={plan === "free" ? "secondary" : "primary"} />
                ) : (
                  <p className="text-center text-xs text-muted">Ask an owner to change plans.</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader
          title="Invoices"
          action={
            provider === "stripe" && canManage && sub?.stripeCustomerId ? (
              <form action={openPortal}><button className="text-xs font-medium text-primary hover:underline">Manage payment method →</button></form>
            ) : undefined
          }
        />
        <Table>
          <thead>
            <tr><Th>Date</Th><Th>Reference</Th><Th>Status</Th><Th className="text-right">Amount</Th></tr>
          </thead>
          <tbody>
            {invoices.length === 0 && <tr><Td colSpan={4} className="py-8 text-center text-muted">No invoices yet.</Td></tr>}
            {invoices.map((i) => (
              <tr key={i.id}>
                <Td>{date(i.createdAt)}</Td>
                <Td className="font-mono text-xs text-muted">{i.externalId}</Td>
                <Td><Badge tone={i.status === "paid" ? "success" : i.status === "failed" ? "danger" : "neutral"}>{i.status}</Badge></Td>
                <Td className="tabular text-right font-medium">{money(i.amount, "USD")}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function Meter({ value, max }: { value: number; max?: number | null }) {
  if (!max) return <p className="mt-2 text-xs text-muted">Unlimited</p>;
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="mt-3 h-1.5 rounded-full bg-surface-2">
      <div className={clsx("h-1.5 rounded-full", pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-warning" : "bg-accent")} style={{ width: `${pct}%` }} />
    </div>
  );
}
