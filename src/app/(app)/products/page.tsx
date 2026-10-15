import Link from "next/link";
import { and, asc, count, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { Box, Download, Plus } from "lucide-react";
import { db, schema } from "@/db";
import { requirePage } from "@/lib/auth";
import { currentPrices } from "@/lib/queries";
import { money } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { FilterBar, Pagination, SortLink, pageOf } from "@/components/list-controls";
import { CsvImport } from "@/components/csv-import";
import { importCsv } from "../lookups-actions";
import { ProductForm } from "./product-forms";

export const metadata = { title: "Products · Pulse Sales" };

const p = schema.products;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const t = await requirePage("LOOKUP_VIEW");
  const { offset, limit } = pageOf(sp);
  const where = and(eq(p.organizationId, t.org.id), isNull(p.deletedAt), sp.q ? or(ilike(p.name, `%${sp.q}%`), ilike(p.sku, `%${sp.q}%`)) : undefined);
  const col = sp.sort === "sku" ? p.sku : p.name;

  const [rows, [{ n }], prices] = await Promise.all([
    db.select().from(p).where(where).orderBy(sp.dir === "desc" ? desc(col) : asc(col)).limit(limit).offset(offset),
    db.select({ n: count() }).from(p).where(where),
    currentPrices(t.org.id),
  ]);

  return (
    <>
      <PageHeader
        title="Products"
        description="Your catalog. Prices are effective-dated in Price history."
        actions={
          <>
            {t.can("EXPORT") && (
              <a href={`/api/export/products?format=csv`} download className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-2">
                <Download className="size-4" /> Export
              </a>
            )}
            {t.can("LOOKUP_EDIT") && <CsvImport label="Import CSV" columns={["sku", "name", "unit", "price"]} required={["sku", "name"]} action={importCsv.bind(null, "products")} />}
          </>
        }
      />
      {t.can("LOOKUP_EDIT") && (
        <details className="group mb-4 rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow)]">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-medium">
            <Plus className="size-4 text-primary transition group-open:rotate-45" /> Add product
          </summary>
          <div className="border-t border-border p-5">
            <ProductForm />
          </div>
        </details>
      )}
      <Card>
        <FilterBar q={sp.q} placeholder="Search name or SKU" />
        {rows.length === 0 ? (
          <EmptyState icon={Box} title={sp.q ? "No products match" : "No products yet"} description={sp.q ? "Try a different search." : "Add a product or import a CSV."} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th><SortLink base="/products" sp={sp} col="sku">SKU</SortLink></Th>
                  <Th><SortLink base="/products" sp={sp} col="name">Name</SortLink></Th>
                  <Th>Unit</Th>
                  <Th className="text-right">Current price</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const price = prices.get(r.id);
                  return (
                    <tr key={r.id} className="hover:bg-surface-2/50">
                      <Td className="font-mono text-xs">{r.sku}</Td>
                      <Td><Link href={`/products/${r.id}`} className="font-medium text-primary hover:underline">{r.name}</Link></Td>
                      <Td className="text-muted">{r.unit}</Td>
                      <Td className="tabular text-right font-medium">{price != null ? money(price, t.org.currency) : <Badge tone="warning">No price</Badge>}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination base="/products" sp={sp} total={n} />
          </>
        )}
      </Card>
    </>
  );
}
