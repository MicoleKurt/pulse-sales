import { and, asc, desc, eq, gte, ilike, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionError, getTenant } from "@/lib/auth";
import { assertFeature, audit, getLimits } from "@/lib/services";
import { REPORT_TABS, buildReport, countLabel, type ReportTab } from "@/lib/reports";
import { currentPrices, parseRange, salesScope } from "@/lib/queries";
import { download, toCsv, toXlsx, type Sheet } from "@/lib/export";
import { isoDate } from "@/lib/format";

export async function GET(req: Request, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  const t = await getTenant();
  if (!t.can("EXPORT")) return new Response("Forbidden", { status: 403 });
  try {
    await assertFeature(t, "exports");
  } catch (e) {
    if (e instanceof ActionError) return new Response(e.message, { status: 402 });
    throw e;
  }

  const sp = Object.fromEntries(new URL(req.url).searchParams);
  let sheet: Sheet;

  if (entity === "sales") {
    const w: SQL[] = salesScope(t);
    if (sp.status) w.push(eq(schema.sales.status, sp.status as "completed"));
    if (sp.rep && t.can("SALES_VIEW_ALL")) w.push(eq(schema.sales.repId, sp.rep));
    if (sp.from) w.push(gte(schema.sales.saleDate, sp.from));
    if (sp.to) w.push(lte(schema.sales.saleDate, sp.to));
    if (sp.q) w.push(or(ilike(schema.customers.name, `%${sp.q}%`), sql`${schema.sales.number}::text ilike ${`%${sp.q}%`}`)!);
    const rows = await db
      .select({ n: schema.sales.number, d: schema.sales.saleDate, c: schema.customers.name, r: schema.users.name, s: schema.sales.status, sub: schema.sales.subtotal, tax: schema.sales.tax, tot: schema.sales.total })
      .from(schema.sales)
      .innerJoin(schema.customers, eq(schema.customers.id, schema.sales.customerId))
      .innerJoin(schema.users, eq(schema.users.id, schema.sales.repId))
      .where(and(...w))
      .orderBy(desc(schema.sales.saleDate));
    sheet = { name: "Sales", columns: ["Number", "Date", "Customer", "Rep", "Status", "Subtotal", "Tax", "Total"], rows: rows.map((r) => [r.n, r.d, r.c, r.r, r.s, r.sub, r.tax, r.tot]) };
  } else if (entity === "customers" && t.can("LOOKUP_VIEW")) {
    const rows = await db
      .select()
      .from(schema.customers)
      .where(and(eq(schema.customers.organizationId, t.org.id), isNull(schema.customers.deletedAt)))
      .orderBy(asc(schema.customers.name));
    sheet = { name: "Customers", columns: ["name", "email", "phone", "address"], rows: rows.map((r) => [r.name, r.email, r.phone, r.address]) };
  } else if (entity === "products" && t.can("LOOKUP_VIEW")) {
    const [rows, prices] = await Promise.all([
      db.select().from(schema.products).where(and(eq(schema.products.organizationId, t.org.id), isNull(schema.products.deletedAt))).orderBy(asc(schema.products.name)),
      currentPrices(t.org.id),
    ]);
    sheet = { name: "Products", columns: ["sku", "name", "unit", "price"], rows: rows.map((r) => [r.sku, r.name, r.unit, prices.get(r.id) ?? null]) };
  } else if (entity === "report" && t.can("REPORT_VIEW")) {
    const range = parseRange(sp);
    const tab = (REPORT_TABS.find((x) => x.key === sp.tab)?.key ?? "period") as ReportTab;
    if (REPORT_TABS.find((x) => x.key === tab)!.advanced && !(await getLimits(t.plan)).advancedReports) return new Response("Upgrade required", { status: 402 });
    const { rows } = await buildReport(t, tab, range);
    sheet = { name: `Report ${tab}`, columns: [tab === "period" ? "Period" : "Name", countLabel(tab), "Revenue"], rows: rows.map((r) => [r.extra ? `${r.label} (${r.extra})` : r.label, r.count, r.revenue]) };
  } else {
    return new Response("Not found", { status: 404 });
  }

  await audit({ orgId: t.org.id, actorId: t.user.id, entity, action: "export", after: { rows: sheet.rows.length, format: sp.format ?? "csv" } });
  const name = `${entity}-${isoDate(new Date())}`;
  return sp.format === "xlsx" ? download(await toXlsx([sheet]), `${name}.xlsx`) : download(toCsv(sheet), `${name}.csv`);
}
