import "server-only";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { Tenant } from "@/lib/auth";

export async function loadSale(t: Tenant, rawId: string) {
  const id = z.string().uuid().safeParse(rawId);
  if (!id.success) notFound();
  const [row] = await db
    .select({ sale: schema.sales, customer: schema.customers, rep: schema.users.name })
    .from(schema.sales)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.sales.customerId))
    .innerJoin(schema.users, eq(schema.users.id, schema.sales.repId))
    .where(and(eq(schema.sales.id, id.data), eq(schema.sales.organizationId, t.org.id), isNull(schema.sales.deletedAt)));
  if (!row) notFound();
  if (!t.can("SALES_VIEW_ALL") && row.sale.repId !== t.user.id) notFound();

  const items = await db
    .select({ item: schema.saleItems, product: schema.products.name, sku: schema.products.sku, unit: schema.products.unit })
    .from(schema.saleItems)
    .innerJoin(schema.products, eq(schema.products.id, schema.saleItems.productId))
    .where(and(eq(schema.saleItems.saleId, id.data), isNull(schema.saleItems.deletedAt)))
    .orderBy(asc(schema.saleItems.createdAt));
  return { ...row, items };
}
