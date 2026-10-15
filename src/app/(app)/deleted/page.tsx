import { and, eq, isNotNull } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db, schema } from "@/db";
import { requirePage } from "@/lib/auth";
import { dateTime, money } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { ActionButton } from "@/components/form";
import { purgeItem, restoreItem } from "./actions";

export const metadata = { title: "Deleted items · Pulse Sales" };

export default async function DeletedPage() {
  const t = await requirePage("SALES_DEL");
  const org = t.org.id;
  const [sales, customers, products, prices] = await Promise.all([
    db
      .select({ id: schema.sales.id, number: schema.sales.number, total: schema.sales.total, deletedAt: schema.sales.deletedAt, customer: schema.customers.name })
      .from(schema.sales)
      .innerJoin(schema.customers, eq(schema.customers.id, schema.sales.customerId))
      .where(and(eq(schema.sales.organizationId, org), isNotNull(schema.sales.deletedAt))),
    db.select().from(schema.customers).where(and(eq(schema.customers.organizationId, org), isNotNull(schema.customers.deletedAt))),
    db.select().from(schema.products).where(and(eq(schema.products.organizationId, org), isNotNull(schema.products.deletedAt))),
    db
      .select({ id: schema.priceHistory.id, unitPrice: schema.priceHistory.unitPrice, effectiveDate: schema.priceHistory.effectiveDate, deletedAt: schema.priceHistory.deletedAt, product: schema.products.name })
      .from(schema.priceHistory)
      .innerJoin(schema.products, eq(schema.products.id, schema.priceHistory.productId))
      .where(and(eq(schema.priceHistory.organizationId, org), isNotNull(schema.priceHistory.deletedAt))),
  ]);

  const items = [
    ...sales.map((s) => ({ entity: "sale", id: s.id, name: `Sale #${s.number} · ${s.customer}`, detail: money(s.total, t.org.currency), deletedAt: s.deletedAt! })),
    ...customers.map((c) => ({ entity: "customer", id: c.id, name: c.name, detail: c.email ?? "", deletedAt: c.deletedAt! })),
    ...products.map((p) => ({ entity: "product", id: p.id, name: p.name, detail: p.sku, deletedAt: p.deletedAt! })),
    ...prices.map((p) => ({ entity: "price", id: p.id, name: `${p.product} price`, detail: `${money(p.unitPrice, t.org.currency)} from ${p.effectiveDate}`, deletedAt: p.deletedAt! })),
  ].sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
  const canPurge = t.role === "owner" || t.role === "admin";

  return (
    <>
      <PageHeader title="Deleted items" description="Soft-deleted records. Restoring a sale also restores its line items." />
      <Card>
        {items.length === 0 ? (
          <EmptyState icon={Trash2} title="Nothing deleted" description="Deleted sales, customers, products and prices show up here." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Type</Th>
                <Th>Item</Th>
                <Th className="hidden md:table-cell">Detail</Th>
                <Th>Deleted</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.entity + i.id}>
                  <Td><Badge>{i.entity}</Badge></Td>
                  <Td className="font-medium">{i.name}</Td>
                  <Td className="hidden text-muted md:table-cell">{i.detail}</Td>
                  <Td className="text-muted">{dateTime(i.deletedAt)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <ActionButton action={restoreItem} fields={{ entity: i.entity, id: i.id }}>Restore</ActionButton>
                      {canPurge && (
                        <ActionButton action={purgeItem} fields={{ entity: i.entity, id: i.id }} variant="ghost" confirm="Permanently delete? This cannot be undone.">
                          Purge
                        </ActionButton>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
