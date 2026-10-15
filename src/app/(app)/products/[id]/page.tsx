import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { db, schema } from "@/db";
import { requirePage } from "@/lib/auth";
import { date, isoDate, money } from "@/lib/format";
import { Badge, Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/ui";
import { ActionButton } from "@/components/form";
import { deleteLookup } from "../../lookups-actions";
import { PriceForm, ProductForm } from "../product-forms";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await requirePage("LOOKUP_VIEW");
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [product] = await db
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.id, id), eq(schema.products.organizationId, t.org.id), isNull(schema.products.deletedAt)));
  if (!product) notFound();
  const prices = await db
    .select()
    .from(schema.priceHistory)
    .where(and(eq(schema.priceHistory.productId, id), isNull(schema.priceHistory.deletedAt)))
    .orderBy(desc(schema.priceHistory.effectiveDate));
  const today = isoDate(new Date());
  const currentId = prices.find((p) => p.effectiveDate <= today)?.id;

  return (
    <>
      <Link href="/products" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Products
      </Link>
      <PageHeader
        title={product.name}
        description={`SKU ${product.sku} · per ${product.unit}`}
        actions={
          t.can("LOOKUP_EDIT") && (
            <ActionButton action={deleteLookup} fields={{ entity: "product", id }} variant="danger" size="md" confirm="Delete this product? Past sales keep their line items.">
              Delete
            </ActionButton>
          )
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Price history" description="The latest price on or before a sale's date is used." />
          <Table>
            <thead>
              <tr>
                <Th>Effective</Th>
                <Th className="text-right">Unit price</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {prices.length === 0 && (
                <tr><Td colSpan={3} className="py-8 text-center text-muted">No prices yet.</Td></tr>
              )}
              {prices.map((p) => (
                <tr key={p.id}>
                  <Td>
                    {date(p.effectiveDate)} {p.id === currentId && <Badge tone="success">current</Badge>}
                    {p.effectiveDate > today && <Badge tone="primary">scheduled</Badge>}
                  </Td>
                  <Td className="tabular text-right font-medium">{money(p.unitPrice, t.org.currency)}</Td>
                  <Td className="text-right">
                    {t.can("LOOKUP_EDIT") && (
                      <ActionButton action={deleteLookup} fields={{ entity: "price", id: p.id }} variant="ghost" confirm="Remove this price?">
                        Remove
                      </ActionButton>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {t.can("LOOKUP_EDIT") && (
            <div className="border-t border-border p-5">
              <PriceForm productId={id} today={today} />
            </div>
          )}
        </Card>
        {t.can("LOOKUP_EDIT") && (
          <Card>
            <CardHeader title="Details" />
            <div className="p-5">
              <ProductForm product={product} />
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
