import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ArrowLeft, ReceiptText } from "lucide-react";
import { z } from "zod";
import { db, schema } from "@/db";
import { requirePage } from "@/lib/auth";
import { salesScope } from "@/lib/queries";
import { date, money } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageHeader, Stat, StatusBadge, Table, Td, Th } from "@/components/ui";
import { ActionButton } from "@/components/form";
import { DollarSign, ShoppingCart } from "lucide-react";
import { deleteLookup } from "../../lookups-actions";
import { CustomerForm } from "../customer-form";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await requirePage("LOOKUP_VIEW");
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [customer] = await db
    .select()
    .from(schema.customers)
    .where(and(eq(schema.customers.id, id), eq(schema.customers.organizationId, t.org.id), isNull(schema.customers.deletedAt)));
  if (!customer) notFound();

  const history = t.can("SALES_VIEW")
    ? await db
        .select({ id: schema.sales.id, number: schema.sales.number, saleDate: schema.sales.saleDate, status: schema.sales.status, total: schema.sales.total, rep: schema.users.name })
        .from(schema.sales)
        .innerJoin(schema.users, eq(schema.users.id, schema.sales.repId))
        .where(and(...salesScope(t), eq(schema.sales.customerId, id)))
        .orderBy(desc(schema.sales.saleDate))
        .limit(100)
    : [];
  const done = history.filter((h) => h.status === "completed");
  const revenue = done.reduce((s, h) => s + h.total, 0);

  return (
    <>
      <Link href="/customers" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Customers
      </Link>
      <PageHeader
        title={customer.name}
        description={[customer.email, customer.phone].filter(Boolean).join(" · ") || undefined}
        actions={
          t.can("LOOKUP_EDIT") && (
            <ActionButton action={deleteLookup} fields={{ entity: "customer", id }} variant="danger" size="md" confirm="Delete this customer?">
              Delete
            </ActionButton>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Lifetime revenue" value={money(revenue, t.org.currency)} icon={DollarSign} />
        <Stat label="Completed orders" value={String(done.length)} icon={ShoppingCart} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Purchase history" />
          {history.length === 0 ? (
            <EmptyState icon={ReceiptText} title="No purchases yet" description="Sales for this customer will appear here." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Date</Th>
                  <Th>Rep</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <Td><Link href={`/sales/${h.id}`} className="font-medium text-primary hover:underline">#{h.number}</Link></Td>
                    <Td className="text-muted">{date(h.saleDate)}</Td>
                    <Td className="text-muted">{h.rep}</Td>
                    <Td><StatusBadge status={h.status} /></Td>
                    <Td className="tabular text-right font-medium">{money(h.total, t.org.currency)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Details" />
          <div className="p-5">
            {t.can("LOOKUP_EDIT") ? (
              <CustomerForm customer={customer} />
            ) : (
              <dl className="space-y-2 text-sm">
                <div><dt className="text-muted">Email</dt><dd>{customer.email ?? "—"}</dd></div>
                <div><dt className="text-muted">Phone</dt><dd>{customer.phone ?? "—"}</dd></div>
                <div><dt className="text-muted">Address</dt><dd>{customer.address ?? "—"}</dd></div>
              </dl>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
