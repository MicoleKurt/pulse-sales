/**
 * Demo data: 1 platform admin, 2 workspaces, 6 users across roles,
 * 50 customers, 30 products with price history and 300 sales over 12 months.
 *
 *   npm run db:seed          (wipes and reseeds everything)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { isPooledUrl } from "../src/db/url";
import { ALL_RIGHTS, DEFAULT_RIGHTS, ROLES } from "../src/lib/rights";
import { DEFAULT_PLAN_LIMITS } from "../src/lib/plans";

const DEFAULT_SEED_PASSWORD = "pulse-demo-123";
const url = process.env.DATABASE_URL!;
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
// The default demo password is public (README), so never use it on a hosted database:
// the seed creates a platform super admin.
if (!isLocal && (!process.env.SEED_PASSWORD || process.env.SEED_PASSWORD === DEFAULT_SEED_PASSWORD)) {
  console.error("Refusing to seed a hosted database with the default demo password. Set a strong SEED_PASSWORD in .env.local.");
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: !isPooledUrl(url) });
const db = drizzle(client, { schema, casing: "snake_case" });

// Deterministic PRNG so every seed produces the same data.
let s = 42;
const rand = () => ((s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)]!;
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const round = (n: number) => Math.round(n * 100) / 100;

const FIRST = ["Maria", "John", "Aiko", "Carlos", "Priya", "Liam", "Sofia", "Noah", "Grace", "Mateo", "Hana", "Ethan", "Zoe", "Lucas", "Ava", "Diego", "Mia", "Oliver", "Isla", "Rafael"];
const LAST = ["Santos", "Reyes", "Tanaka", "Garcia", "Patel", "Nguyen", "Cruz", "Kim", "Lopez", "Smith", "Dela Cruz", "Bautista", "Chen", "Mendoza", "Ramos"];
const COMPANY = ["Trading", "Supplies", "Hardware", "Mart", "Enterprises", "Retail", "Foods", "Logistics", "Distributors", "Co."];
const PRODUCTS: [string, string, number][] = [
  ["Steel Bolt M8", "box", 12.5], ["Copper Wire 2mm", "roll", 48], ["PVC Pipe 1in", "pc", 6.75], ["LED Bulb 9W", "pc", 3.2], ["Paint White 4L", "can", 22],
  ["Drill Bit Set", "set", 35], ["Safety Gloves", "pair", 4.5], ["Cement 40kg", "bag", 8.9], ["Plywood 1/2in", "sheet", 28], ["Wood Screws", "box", 9.8],
  ["Circuit Breaker 20A", "pc", 15], ["Extension Cord 5m", "pc", 11], ["Tile Adhesive", "bag", 14.25], ["Sandpaper Pack", "pack", 5.5], ["Measuring Tape", "pc", 7.2],
  ["Hammer 16oz", "pc", 13.9], ["Wrench Set", "set", 42], ["Silicone Sealant", "tube", 6.3], ["Door Hinge", "pair", 3.75], ["Padlock 50mm", "pc", 9.4],
  ["Water Pump 1HP", "unit", 189], ["Garden Hose 20m", "roll", 24.5], ["Ladder 6ft", "unit", 79], ["Work Light", "unit", 31], ["Angle Grinder", "unit", 96],
  ["Welding Rods", "kg", 5.95], ["Roof Sheet", "sheet", 17.8], ["Gutter 3m", "pc", 12.6], ["Faucet Chrome", "pc", 26], ["Toilet Seat", "pc", 19.5],
];

async function main() {
  console.log("Resetting data…");
  await db.execute(sql`truncate table users, organizations, plan_limits, webhook_events, email_outbox restart identity cascade`);

  await db.insert(schema.planLimits).values(DEFAULT_PLAN_LIMITS);

  const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD ?? DEFAULT_SEED_PASSWORD, 11);
  const mkUser = async (name: string, email: string, createdAt = daysAgo(int(30, 360))) =>
    (await db.insert(schema.users).values({ name, email, passwordHash, createdAt }).returning())[0]!;

  const admin = await mkUser("Platform Admin", "admin@pulse.test", daysAgo(400));
  await db.insert(schema.platformAdmins).values({ userId: admin.id, role: "super" });

  const people = {
    owner: await mkUser("Olivia Owner", "owner@acme.test", daysAgo(380)),
    admin: await mkUser("Adam Admin", "admin@acme.test"),
    manager: await mkUser("Mona Manager", "manager@acme.test"),
    rep1: await mkUser("Rico Rep", "rep@acme.test"),
    rep2: await mkUser("Rina Rep", "rep2@acme.test"),
    owner2: await mkUser("Ben Builder", "owner@buildright.test", daysAgo(120)),
  };

  const mkOrg = async (name: string, slug: string, plan: schema.Plan, createdAt: Date, members: [typeof schema.users.$inferSelect, schema.Role][]) => {
    const [org] = await db.insert(schema.organizations).values({ name, slug, plan, currency: "USD", taxRate: 12, createdAt, nextSaleNo: 1001 }).returning();
    await db.insert(schema.members).values(members.map(([u, role]) => ({ organizationId: org!.id, userId: u.id, role })));
    await db.insert(schema.roleRights).values(
      ROLES.flatMap((role) => ALL_RIGHTS.map((right) => ({ organizationId: org!.id, role, right, allowed: DEFAULT_RIGHTS[role].includes(right) }))),
    );
    for (const [u] of members) await db.update(schema.users).set({ lastOrgId: org!.id }).where(sql`id = ${u.id}`);
    return org!;
  };

  const acme = await mkOrg("Acme Trading Co.", "acme-trading", "business", daysAgo(380), [
    [people.owner, "owner"], [people.admin, "admin"], [people.manager, "manager"], [people.rep1, "rep"], [people.rep2, "rep"],
  ]);
  const build = await mkOrg("BuildRight Hardware", "buildright", "pro", daysAgo(120), [[people.owner2, "owner"], [people.rep1, "rep"]]);
  // Rico belongs to two workspaces; keep Acme as his default.
  await db.update(schema.users).set({ lastOrgId: acme.id }).where(sql`id = ${people.rep1.id}`);

  await db.insert(schema.subscriptions).values([
    { organizationId: acme.id, plan: "business", status: "active", seats: 5, currentPeriodEnd: daysAgo(-18) },
    { organizationId: build.id, plan: "pro", status: "active", seats: 2, currentPeriodEnd: daysAgo(-9) },
  ]);
  const invoices = [];
  for (let m = 11; m >= 0; m--) invoices.push({ organizationId: acme.id, amount: 5 * 39, status: "paid", periodStart: daysAgo(m * 30), createdAt: daysAgo(m * 30), externalId: `seed_acme_${m}` });
  for (let m = 3; m >= 0; m--) invoices.push({ organizationId: build.id, amount: 2 * 19, status: m === 0 ? "failed" : "paid", periodStart: daysAgo(m * 30), createdAt: daysAgo(m * 30), externalId: `seed_build_${m}` });
  await db.insert(schema.invoices).values(invoices);

  // A few extra trial / free workspaces so the platform console has something to show.
  for (const [i, n] of ["Northwind Foods", "Blue Harbor Retail", "Sunrise Mart"].entries()) {
    const u = await mkUser(`${pick(FIRST)} ${pick(LAST)}`, `owner${i}@${n.split(" ")[0]!.toLowerCase()}.test`, daysAgo(int(2, 40)));
    const org = await mkOrg(n, `${n.toLowerCase().replace(/\W+/g, "-")}`, "free", u.createdAt, [[u, "owner"]]);
    if (i < 2) await db.update(schema.organizations).set({ trialEndsAt: daysAgo(-int(3, 12)) }).where(sql`id = ${org.id}`);
    await db.insert(schema.subscriptions).values({ organizationId: org.id, plan: i < 2 ? "pro" : "free", status: i < 2 ? "trialing" : "canceled", seats: 1 });
  }

  // ── Acme sales data ──
  console.log("Seeding customers, products, prices and sales…");
  const customers = await db
    .insert(schema.customers)
    .values(
      Array.from({ length: 50 }, (_, i) => {
        const name = i % 3 === 0 ? `${pick(FIRST)} ${pick(LAST)}` : `${pick(LAST)} ${pick(COMPANY)}`;
        return { organizationId: acme.id, name, email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}${i}@example.com`, phone: `+1 555 ${String(1000 + i * 37).slice(-4)}`, address: `${int(1, 999)} Market St`, createdBy: people.owner.id, createdAt: daysAgo(int(200, 370)) };
      }),
    )
    .returning();

  const products = await db
    .insert(schema.products)
    .values(PRODUCTS.map(([name, unit], i) => ({ organizationId: acme.id, sku: `SKU-${String(i + 1).padStart(3, "0")}`, name, unit, createdBy: people.owner.id, createdAt: daysAgo(375) })))
    .returning();

  // Three price points per product: a year ago, ~6 months ago (+5–12%), ~2 months ago (±).
  const priceRows = products.flatMap((p, i) => {
    const base = PRODUCTS[i]![2];
    const mid = round(base * (1 + int(5, 12) / 100));
    const now = round(mid * (1 + int(-3, 8) / 100));
    return [
      { productId: p.id, unitPrice: base, effectiveDate: iso(daysAgo(370)) },
      { productId: p.id, unitPrice: mid, effectiveDate: iso(daysAgo(int(170, 190))) },
      { productId: p.id, unitPrice: now, effectiveDate: iso(daysAgo(int(50, 70))) },
    ].map((r) => ({ ...r, organizationId: acme.id, createdBy: people.manager.id }));
  });
  await db.insert(schema.priceHistory).values(priceRows);
  const priceOn = (productId: string, date: string) =>
    priceRows.filter((r) => r.productId === productId && r.effectiveDate <= date).sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0]!.unitPrice;

  const reps = [people.rep1, people.rep2, people.manager, people.admin];
  const repWeights = [0.38, 0.32, 0.2, 0.1];
  const pickRep = () => {
    let r = rand();
    for (let i = 0; i < reps.length; i++) if ((r -= repWeights[i]!) <= 0) return reps[i]!;
    return reps[0]!;
  };

  for (let i = 0; i < 300; i++) {
    // Skew toward recent months for a growth curve.
    const age = Math.floor(Math.pow(rand(), 1.4) * 360);
    const saleDate = iso(daysAgo(age));
    const lines = Array.from({ length: int(1, 4) }, () => {
      const p = pick(products);
      const quantity = int(1, 12);
      const unitPrice = priceOn(p.id, saleDate);
      return { productId: p.id, quantity, unitPrice, lineTotal: round(unitPrice * quantity) };
    });
    const subtotal = round(lines.reduce((a, l) => a + l.lineTotal, 0));
    const tax = round(subtotal * 0.12);
    const status = rand() < 0.92 ? "completed" : rand() < 0.5 ? "draft" : "cancelled";
    const rep = pickRep();
    const createdAt = new Date(saleDate + "T10:00:00Z");
    const [sale] = await db
      .insert(schema.sales)
      .values({ organizationId: acme.id, number: 1001 + i, customerId: pick(customers).id, repId: rep.id, saleDate, status: status as "completed", subtotal, tax, total: round(subtotal + tax), createdBy: rep.id, createdAt, updatedAt: createdAt })
      .returning();
    await db.insert(schema.saleItems).values(lines.map((l) => ({ ...l, saleId: sale!.id, organizationId: acme.id, createdBy: rep.id, createdAt })));
  }
  await db.update(schema.organizations).set({ nextSaleNo: 1301 }).where(sql`id = ${acme.id}`);

  // Small dataset for BuildRight so tenant isolation is visible.
  const [bc] = await db.insert(schema.customers).values({ organizationId: build.id, name: "Highland Contractors", email: "orders@highland.example.com", createdBy: people.owner2.id }).returning();
  const [bp] = await db.insert(schema.products).values({ organizationId: build.id, sku: "BR-001", name: "Framing Nails 3in", unit: "box", createdBy: people.owner2.id }).returning();
  await db.insert(schema.priceHistory).values({ organizationId: build.id, productId: bp!.id, unitPrice: 18, effectiveDate: iso(daysAgo(100)), createdBy: people.owner2.id });
  const [bs] = await db
    .insert(schema.sales)
    .values({ organizationId: build.id, number: 1001, customerId: bc!.id, repId: people.rep1.id, saleDate: iso(daysAgo(3)), subtotal: 90, tax: 10.8, total: 100.8, createdBy: people.rep1.id })
    .returning();
  await db.insert(schema.saleItems).values({ organizationId: build.id, saleId: bs!.id, productId: bp!.id, quantity: 5, unitPrice: 18, lineTotal: 90, createdBy: people.rep1.id });
  await db.update(schema.organizations).set({ nextSaleNo: 1002 }).where(sql`id = ${build.id}`);

  await db.insert(schema.auditLog).values({ organizationId: acme.id, actorId: people.owner.id, entity: "organization", entityId: acme.id, action: "seed", after: { note: "Demo data loaded" } });
  await db.insert(schema.announcements).values({ message: "Welcome to Pulse Sales! This is demo data. Sign in as any @acme.test account to explore roles.", createdBy: admin.id, endsAt: daysAgo(-30) });
  await db.insert(schema.notifications).values({ userId: people.owner.id, organizationId: acme.id, title: "Payment received", body: "Business plan renewed.", href: "/settings/billing" });

  console.log("Done. Accounts (password = SEED_PASSWORD):");
  console.table([
    ["admin@pulse.test", "Platform super admin"],
    ["owner@acme.test", "Acme owner (Business)"],
    ["admin@acme.test", "Acme admin"],
    ["manager@acme.test", "Acme manager"],
    ["rep@acme.test", "Acme rep + BuildRight rep"],
    ["rep2@acme.test", "Acme rep"],
    ["owner@buildright.test", "BuildRight owner (Pro)"],
  ]);
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});
