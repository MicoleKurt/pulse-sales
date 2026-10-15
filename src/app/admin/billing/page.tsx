import Link from "next/link";
import { desc, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { billingProvider } from "@/lib/billing";
import { date, dateTime, money } from "@/lib/format";
import { Badge, Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/ui";

export default async function AdminBillingPage() {
  const [subs, invoices, limits] = await Promise.all([
    db
      .select({ sub: schema.subscriptions, org: schema.organizations.name })
      .from(schema.subscriptions)
      .innerJoin(schema.organizations, eq(schema.organizations.id, schema.subscriptions.organizationId))
      .where(ne(schema.subscriptions.plan, "free"))
      .orderBy(desc(schema.subscriptions.updatedAt)),
    db
      .select({ inv: schema.invoices, org: schema.organizations.name })
      .from(schema.invoices)
      .innerJoin(schema.organizations, eq(schema.organizations.id, schema.invoices.organizationId))
      .orderBy(desc(schema.invoices.createdAt))
      .limit(50),
    db.select().from(schema.planLimits),
  ]);
  const price = new Map(limits.map((l) => [l.plan, l.pricePerSeat]));
  const failed = invoices.filter((i) => i.inv.status === "failed");

  return (
    <>
      <PageHeader title="Billing" description={`Provider: ${billingProvider().name}`} />
      {failed.length > 0 && (
        <Card className="mb-4 border-danger/40">
          <CardHeader title={`Failed payments (${failed.length})`} />
          <Table>
            <tbody>
              {failed.map((f) => (
                <tr key={f.inv.id}>
                  <Td><Link href={`/admin/organizations/${f.inv.organizationId}`} className="font-medium text-primary hover:underline">{f.org}</Link></Td>
                  <Td>{dateTime(f.inv.createdAt)}</Td>
                  <Td className="tabular text-right text-danger">{money(f.inv.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Subscriptions" description="Trialing and paid workspaces" />
          <Table>
            <thead>
              <tr><Th>Organization</Th><Th>Plan</Th><Th>Status</Th><Th className="text-right">Seats</Th><Th className="text-right">MRR</Th><Th>Renews</Th></tr>
            </thead>
            <tbody>
              {subs.length === 0 && <tr><Td colSpan={6} className="py-8 text-center text-muted">No subscriptions.</Td></tr>}
              {subs.map(({ sub, org }) => (
                <tr key={sub.organizationId}>
                  <Td><Link href={`/admin/organizations/${sub.organizationId}`} className="font-medium text-primary hover:underline">{org}</Link></Td>
                  <Td><Badge tone="primary">{sub.plan}</Badge></Td>
                  <Td><Badge tone={sub.status === "active" ? "success" : sub.status === "past_due" ? "danger" : "neutral"}>{sub.status}</Badge></Td>
                  <Td className="tabular text-right">{sub.seats}</Td>
                  <Td className="tabular text-right">{sub.status === "active" || sub.status === "past_due" ? money(sub.seats * (price.get(sub.plan) ?? 0)) : "—"}</Td>
                  <Td className="text-muted">{date(sub.currentPeriodEnd)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Recent invoices" />
          <Table>
            <thead>
              <tr><Th>Organization</Th><Th>Date</Th><Th>Status</Th><Th className="text-right">Amount</Th></tr>
            </thead>
            <tbody>
              {invoices.length === 0 && <tr><Td colSpan={4} className="py-8 text-center text-muted">No invoices.</Td></tr>}
              {invoices.map(({ inv, org }) => (
                <tr key={inv.id}>
                  <Td className="font-medium">{org}</Td>
                  <Td className="text-muted">{date(inv.createdAt)}</Td>
                  <Td><Badge tone={inv.status === "paid" ? "success" : "danger"}>{inv.status}</Badge></Td>
                  <Td className="tabular text-right">{money(inv.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
