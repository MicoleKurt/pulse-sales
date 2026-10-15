import "server-only";
import { and, count, eq, gte, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Plan } from "@/db/schema";
import { DEFAULT_RIGHTS, ALL_RIGHTS, ROLES } from "./rights";
import { slugify } from "./format";
import { ActionError, type Tenant } from "./auth";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function audit(
  entry: {
    orgId: string | null;
    actorId: string | null;
    entity: string;
    entityId?: string | null;
    action: string;
    before?: unknown;
    after?: unknown;
    scope?: "tenant" | "platform";
  },
  tx: Tx | typeof db = db,
) {
  await tx.insert(schema.auditLog).values({
    organizationId: entry.orgId,
    actorId: entry.actorId,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    action: entry.action,
    before: entry.before ?? null,
    after: entry.after ?? null,
    scope: entry.scope ?? "tenant",
  });
}

/** Local-first mail: everything lands in email_outbox (viewable in the admin console) and the server log. */
export async function sendMail(to: string, subject: string, body: string) {
  await db.insert(schema.outbox).values({ to, subject, body });
  console.info(`\n✉  To: ${to}\n   ${subject}\n   ${body}\n`);
}

export async function notify(userId: string, orgId: string | null, title: string, body?: string, href?: string) {
  await db.insert(schema.notifications).values({ userId, organizationId: orgId, title, body, href });
}

export async function createOrganization(
  input: { name: string; currency: string; taxRate: number; ownerId: string },
  tx: Tx,
) {
  const base = slugify(input.name) || "org";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  const trialEndsAt = new Date(Date.now() + 14 * 86_400_000);
  const [org] = await tx
    .insert(schema.organizations)
    .values({ name: input.name, slug, currency: input.currency, taxRate: input.taxRate, trialEndsAt })
    .returning();
  await tx.insert(schema.members).values({ organizationId: org!.id, userId: input.ownerId, role: "owner" });
  await tx.insert(schema.roleRights).values(
    ROLES.flatMap((role) => ALL_RIGHTS.map((right) => ({ organizationId: org!.id, role, right, allowed: DEFAULT_RIGHTS[role].includes(right) }))),
  );
  await tx.insert(schema.subscriptions).values({ organizationId: org!.id, plan: "pro", status: "trialing", seats: 1, currentPeriodEnd: trialEndsAt });
  await tx.update(schema.users).set({ lastOrgId: org!.id }).where(eq(schema.users.id, input.ownerId));
  await audit({ orgId: org!.id, actorId: input.ownerId, entity: "organization", entityId: org!.id, action: "create", after: org }, tx);
  return org!;
}

export async function getLimits(plan: Plan) {
  const [row] = await db.select().from(schema.planLimits).where(eq(schema.planLimits.plan, plan));
  return (
    row ?? { plan, pricePerSeat: 0, maxSeats: 1, maxSalesPerMonth: 100, exports: false, auditLog: false, advancedReports: false }
  );
}

export async function assertCanCreateSale(t: Tenant) {
  const limits = await getLimits(t.plan);
  if (limits.maxSalesPerMonth == null) return;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.sales)
    .where(and(eq(schema.sales.organizationId, t.org.id), isNull(schema.sales.deletedAt), gte(schema.sales.createdAt, monthStart)));
  if (n >= limits.maxSalesPerMonth)
    throw new ActionError(`Your ${t.plan} plan allows ${limits.maxSalesPerMonth} sales per month. Upgrade in Settings → Billing.`);
}

export async function assertCanAddSeat(t: Tenant) {
  const limits = await getLimits(t.plan);
  if (limits.maxSeats == null) return;
  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.members)
    .where(and(eq(schema.members.organizationId, t.org.id), eq(schema.members.status, "active")));
  if (n >= limits.maxSeats) throw new ActionError(`Your ${t.plan} plan allows ${limits.maxSeats} seat(s). Upgrade to add more members.`);
}

export async function assertFeature(t: Tenant, feature: "exports" | "auditLog" | "advancedReports") {
  const limits = await getLimits(t.plan);
  if (!limits[feature]) throw new ActionError("This feature isn't included in your plan. Upgrade in Settings → Billing.");
}
