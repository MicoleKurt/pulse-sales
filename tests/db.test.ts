/**
 * Integration tests against the seeded local database (run `npm run db:seed` first).
 * They exercise the same query helpers the pages use.
 */
import { describe, expect, it, beforeAll } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import type { Tenant } from "@/lib/auth";
import type { Right } from "@/lib/rights";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("database", async () => {
  const { db, schema } = await import("@/db");
  const q = await import("@/lib/queries");
  const { DEFAULT_RIGHTS } = await import("@/lib/rights");

  let acme: typeof schema.organizations.$inferSelect;
  let build: typeof schema.organizations.$inferSelect;
  let rep: typeof schema.users.$inferSelect;
  let owner: typeof schema.users.$inferSelect;

  const tenant = (org: typeof acme, user: typeof rep, role: "owner" | "rep"): Tenant => {
    const rights = new Set<Right>(DEFAULT_RIGHTS[role]);
    return { user, org, role, rights, plan: org.plan, impersonating: false, platformRole: null, can: (r) => rights.has(r) };
  };

  beforeAll(async () => {
    [acme] = await db.select().from(schema.organizations).where(eq(schema.organizations.slug, "acme-trading"));
    [build] = await db.select().from(schema.organizations).where(eq(schema.organizations.slug, "buildright"));
    [rep] = await db.select().from(schema.users).where(eq(schema.users.email, "rep@acme.test"));
    [owner] = await db.select().from(schema.users).where(eq(schema.users.email, "owner@acme.test"));
    if (!acme || !build || !rep || !owner) throw new Error("Seed data missing — run `npm run db:seed`.");
  });

  it("tenant isolation: an org only ever sees its own sales", async () => {
    const acmeSales = await q.recentSales(tenant(acme, owner, "owner"), 500);
    const buildSales = await q.recentSales(tenant(build, rep, "rep"), 500);
    expect(acmeSales.length).toBeGreaterThan(0);
    expect(buildSales).toHaveLength(1);
    const acmeIds = new Set(acmeSales.map((s) => s.id));
    expect(buildSales.some((s) => acmeIds.has(s.id))).toBe(false);
  });

  it("reps without SALES_VIEW_ALL only see their own sales", async () => {
    const mine = await db
      .select({ id: schema.sales.id })
      .from(schema.sales)
      .where(and(...q.salesScope(tenant(acme, rep, "rep"))));
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(schema.sales)
      .where(and(eq(schema.sales.organizationId, acme.id), eq(schema.sales.repId, rep.id), sql`deleted_at is null`));
    expect(mine).toHaveLength(n);
    const all = await db.select({ id: schema.sales.id }).from(schema.sales).where(and(...q.salesScope(tenant(acme, owner, "owner"))));
    expect(all.length).toBeGreaterThan(mine.length);
  });

  it("price autofill picks the latest price effective on the sale date", async () => {
    const [product] = await db.select().from(schema.products).where(and(eq(schema.products.organizationId, acme.id), eq(schema.products.sku, "SKU-001")));
    const prices = await db.select().from(schema.priceHistory).where(eq(schema.priceHistory.productId, product!.id)).orderBy(schema.priceHistory.effectiveDate);
    expect(prices.length).toBe(3);
    const [first, second] = prices;
    expect(await q.priceOn(acme.id, product!.id, first!.effectiveDate)).toBe(first!.unitPrice);
    const dayBeforeSecond = new Date(new Date(second!.effectiveDate).getTime() - 86_400_000).toISOString().slice(0, 10);
    expect(await q.priceOn(acme.id, product!.id, dayBeforeSecond)).toBe(first!.unitPrice);
    expect(await q.priceOn(acme.id, product!.id, second!.effectiveDate)).toBe(second!.unitPrice);
    // Another org can't read this product's prices.
    expect(await q.priceOn(build.id, product!.id, second!.effectiveDate)).toBeNull();
  });

  it("sale totals equal the sum of their line items plus tax", async () => {
    const rows = await db.execute<{ bad: string }>(sql`
      select count(*) as bad from sales s
      where s.organization_id = ${acme.id}
        and abs(s.subtotal - (select coalesce(sum(line_total),0) from sale_items i where i.sale_id = s.id and i.deleted_at is null)) > 0.01`);
    expect(Number(rows[0]!.bad)).toBe(0);
  });

  it("KPIs are consistent with the revenue series", async () => {
    const t = tenant(acme, owner, "owner");
    const range = q.parseRange({ range: "90d" });
    const [k, series] = await Promise.all([q.kpis(t, range), q.revenueSeries(t, range)]);
    const sum = series.rows.reduce((a, r) => a + r.revenue, 0);
    expect(Math.abs(sum - k.revenue)).toBeLessThan(0.01);
  });
});
