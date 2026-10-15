import "server-only";
import { and, desc, eq, gte, isNull, lte, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Tenant } from "./auth";
import { isoDate } from "./format";

const { sales, saleItems, products, customers, users } = schema;

/** Base filter for sales the current user may see: own org, not deleted, own rows for reps. */
export function salesScope(t: Tenant): SQL[] {
  const w: SQL[] = [eq(sales.organizationId, t.org.id), isNull(sales.deletedAt)];
  if (!t.can("SALES_VIEW_ALL")) w.push(eq(sales.repId, t.user.id));
  return w;
}

export type Range = { from: string; to: string; label: string; key: string };

export function parseRange(params: { range?: string; from?: string; to?: string }): Range {
  const today = new Date();
  const to = isoDate(today);
  const back = (days: number) => isoDate(new Date(today.getTime() - (days - 1) * 86_400_000));
  switch (params.range) {
    case "7d":
      return { from: back(7), to, label: "Last 7 days", key: "7d" };
    case "90d":
      return { from: back(90), to, label: "Last 90 days", key: "90d" };
    case "12m":
      return { from: back(365), to, label: "Last 12 months", key: "12m" };
    case "ytd":
      return { from: `${today.getFullYear()}-01-01`, to, label: "Year to date", key: "ytd" };
    case "custom":
      if (params.from && params.to && params.from <= params.to) return { from: params.from, to: params.to, label: `${params.from} → ${params.to}`, key: "custom" };
  }
  return { from: back(30), to, label: "Last 30 days", key: "30d" };
}

export function previousRange(r: Range): Range {
  const from = new Date(r.from + "T00:00:00Z");
  const to = new Date(r.to + "T00:00:00Z");
  const span = to.getTime() - from.getTime() + 86_400_000;
  return { from: isoDate(new Date(from.getTime() - span)), to: isoDate(new Date(from.getTime() - 86_400_000)), label: "prev", key: "prev" };
}

const completed = eq(sales.status, "completed");
const inRange = (r: Range) => and(gte(sales.saleDate, r.from), lte(sales.saleDate, r.to));

export async function kpis(t: Tenant, r: Range) {
  const [row] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${sales.total}), 0)`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
      customers: sql<number>`count(distinct ${sales.customerId})`.mapWith(Number),
    })
    .from(sales)
    .where(and(...salesScope(t), completed, inRange(r)));
  return { revenue: row!.revenue, count: row!.count, avg: row!.count ? row!.revenue / row!.count : 0, customers: row!.customers };
}

export async function revenueSeries(t: Tenant, r: Range) {
  const days = (new Date(r.to).getTime() - new Date(r.from).getTime()) / 86_400_000;
  const bucket = days > 120 ? "month" : days > 45 ? "week" : "day";
  const rows = await db
    .select({
      bucket: sql<string>`to_char(date_trunc(${sql.raw(`'${bucket}'`)}, ${sales.saleDate}::timestamp), 'YYYY-MM-DD')`,
      revenue: sql<number>`sum(${sales.total})`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(sales)
    .where(and(...salesScope(t), completed, inRange(r)))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  return { bucket, rows };
}

export async function topReps(t: Tenant, r: Range, limit = 5) {
  return db
    .select({
      id: users.id,
      name: users.name,
      revenue: sql<number>`sum(${sales.total})`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(sales)
    .innerJoin(users, eq(users.id, sales.repId))
    .where(and(...salesScope(t), completed, inRange(r)))
    .groupBy(users.id, users.name)
    .orderBy(desc(sql`3`))
    .limit(limit);
}

export async function topCustomers(t: Tenant, r: Range, limit = 5) {
  return db
    .select({
      id: customers.id,
      name: customers.name,
      revenue: sql<number>`sum(${sales.total})`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(sales)
    .innerJoin(customers, eq(customers.id, sales.customerId))
    .where(and(...salesScope(t), completed, inRange(r)))
    .groupBy(customers.id, customers.name)
    .orderBy(desc(sql`3`))
    .limit(limit);
}

export async function topProducts(t: Tenant, r: Range, limit = 5) {
  return db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      quantity: sql<number>`sum(${saleItems.quantity})`.mapWith(Number),
      revenue: sql<number>`sum(${saleItems.lineTotal})`.mapWith(Number),
    })
    .from(saleItems)
    .innerJoin(sales, eq(sales.id, saleItems.saleId))
    .innerJoin(products, eq(products.id, saleItems.productId))
    .where(and(...salesScope(t), completed, inRange(r), isNull(saleItems.deletedAt)))
    .groupBy(products.id, products.name, products.sku)
    .orderBy(desc(sql`5`))
    .limit(limit);
}

export async function recentSales(t: Tenant, limit = 6) {
  return db
    .select({ id: sales.id, number: sales.number, total: sales.total, saleDate: sales.saleDate, status: sales.status, customer: customers.name, rep: users.name })
    .from(sales)
    .innerJoin(customers, eq(customers.id, sales.customerId))
    .innerJoin(users, eq(users.id, sales.repId))
    .where(and(...salesScope(t)))
    .orderBy(desc(sales.saleDate), desc(sales.number))
    .limit(limit);
}

/** Latest price effective on or before the given date — the HOPE "price autofill" rule. */
export async function priceOn(orgId: string, productId: string, onDate: string) {
  const [row] = await db
    .select({ unitPrice: schema.priceHistory.unitPrice })
    .from(schema.priceHistory)
    .where(
      and(
        eq(schema.priceHistory.organizationId, orgId),
        eq(schema.priceHistory.productId, productId),
        isNull(schema.priceHistory.deletedAt),
        lte(schema.priceHistory.effectiveDate, onDate),
      ),
    )
    .orderBy(desc(schema.priceHistory.effectiveDate))
    .limit(1);
  return row?.unitPrice ?? null;
}

/** Current price per product (for pickers). */
export async function currentPrices(orgId: string) {
  const rows = await db.execute<{ product_id: string; unit_price: string }>(sql`
    select distinct on (product_id) product_id, unit_price
    from price_history
    where organization_id = ${orgId} and deleted_at is null and effective_date <= current_date
    order by product_id, effective_date desc`);
  return new Map(rows.map((r) => [r.product_id, Number(r.unit_price)]));
}
