import Link from "next/link";
import { and, asc, count, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { Plus, Tag } from "lucide-react";
import { db, schema } from "@/db";
import { requirePage } from "@/lib/auth";
import { date, isoDate, money } from "@/lib/format";
import { Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { FilterBar, Pagination, pageOf } from "@/components/list-controls";
import { PriceForm } from "../products/product-forms";

export const metadata = { title: "Price history · Pulse Sales" };

const { priceHistory: ph, products: p } = schema;

export default async function PricesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const t = await requirePage("LOOKUP_VIEW");
  const { offset, limit } = pageOf(sp);
  const where = and(eq(ph.organizationId, t.org.id), isNull(ph.deletedAt), isNull(p.deletedAt), sp.q ? or(ilike(p.name, `%${sp.q}%`), ilike(p.sku, `%${sp.q}%`)) : undefined);

  const [rows, [{ n }], products] = await Promise.all([
    db
      .select({ id: ph.id, unitPrice: ph.unitPrice, effectiveDate: ph.effectiveDate, productId: p.id, name: p.name, sku: p.sku })
      .from(ph)
      .innerJoin(p, eq(p.id, ph.productId))
      .where(where)
      .orderBy(desc(ph.effectiveDate), asc(p.name))
      .limit(limit)
      .offset(offset),
    db.select({ n: count() }).from(ph).innerJoin(p, eq(p.id, ph.productId)).where(where),
    db.select({ id: p.id, name: p.name }).from(p).where(and(eq(p.organizationId, t.org.id), isNull(p.deletedAt))).orderBy(asc(p.name)),
  ]);

  return (
    <>
      <PageHeader title="Price history" description="Effective-dated prices. Sales auto-fill the price valid on their date." />
      {t.can("LOOKUP_EDIT") && products.length > 0 && (
        <details className="group mb-4 rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow)]">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-medium">
            <Plus className="size-4 text-primary transition group-open:rotate-45" /> Add price
          </summary>
          <div className="border-t border-border p-5">
            <PriceForm products={products} today={isoDate(new Date())} />
          </div>
        </details>
      )}
      <Card>
        <FilterBar q={sp.q} placeholder="Search product or SKU" />
        {rows.length === 0 ? (
          <EmptyState icon={Tag} title="No prices yet" description="Add products with a starting price, or add prices here." />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>SKU</Th>
                  <Th>Effective date</Th>
                  <Th className="text-right">Unit price</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-2/50">
                    <Td><Link href={`/products/${r.productId}`} className="font-medium text-primary hover:underline">{r.name}</Link></Td>
                    <Td className="font-mono text-xs">{r.sku}</Td>
                    <Td className="text-muted">{date(r.effectiveDate)}</Td>
                    <Td className="tabular text-right font-medium">{money(r.unitPrice, t.org.currency)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination base="/prices" sp={sp} total={n} />
          </>
        )}
      </Card>
    </>
  );
}
