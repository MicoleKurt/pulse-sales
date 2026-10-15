import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Tenant } from "@/lib/auth";
import { currentPrices } from "@/lib/queries";

/** Options for the sale form, all scoped to the active org. */
export async function saleFormOptions(t: Tenant) {
  const [customers, reps, products, prices] = await Promise.all([
    db
      .select({ id: schema.customers.id, name: schema.customers.name })
      .from(schema.customers)
      .where(and(eq(schema.customers.organizationId, t.org.id), isNull(schema.customers.deletedAt)))
      .orderBy(asc(schema.customers.name)),
    db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.members)
      .innerJoin(schema.users, eq(schema.users.id, schema.members.userId))
      .where(and(eq(schema.members.organizationId, t.org.id), eq(schema.members.status, "active")))
      .orderBy(asc(schema.users.name)),
    db
      .select({ id: schema.products.id, name: schema.products.name, sku: schema.products.sku, unit: schema.products.unit })
      .from(schema.products)
      .where(and(eq(schema.products.organizationId, t.org.id), isNull(schema.products.deletedAt)))
      .orderBy(asc(schema.products.name)),
    currentPrices(t.org.id),
  ]);
  return {
    currency: t.org.currency,
    taxRate: t.org.taxRate,
    customers,
    reps,
    products: products.map((p) => ({ ...p, price: prices.get(p.id) ?? null })),
    canPickRep: t.can("SALES_VIEW_ALL"),
  };
}
