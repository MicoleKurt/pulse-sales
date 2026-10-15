import "server-only";
import Stripe from "stripe";
import { and, count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Plan } from "@/db/schema";
import { audit, getLimits, notify } from "./services";
import { ActionError } from "./auth";

/**
 * Billing has two providers behind one interface:
 *  - "stripe": used when STRIPE_SECRET_KEY + price ids are set (Checkout, Portal, webhooks).
 *  - "local":  plan changes apply instantly and a paid invoice is recorded. Lets the whole
 *              product run offline without Stripe while exercising the same code paths.
 */
export interface BillingProvider {
  name: "stripe" | "local";
  checkout(i: { orgId: string; plan: Plan; userId: string; email: string }): Promise<string | null>;
  portal(orgId: string): Promise<string | null>;
  cancel(orgId: string): Promise<void>;
}

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

export async function activeSeats(orgId: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.members)
    .where(and(eq(schema.members.organizationId, orgId), eq(schema.members.status, "active")));
  return Math.max(1, n);
}

/** Single place that moves an org between plans; used by both providers and the admin console. */
export async function applySubscription(input: {
  orgId: string;
  plan: Plan;
  status: string;
  seats?: number;
  periodEnd?: Date | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  actorId?: string | null;
}) {
  const seats = input.seats ?? (await activeSeats(input.orgId));
  const values = {
    plan: input.plan,
    status: input.status,
    seats,
    currentPeriodEnd: input.periodEnd ?? null,
    ...(input.stripeCustomerId !== undefined && { stripeCustomerId: input.stripeCustomerId }),
    ...(input.stripeSubscriptionId !== undefined && { stripeSubscriptionId: input.stripeSubscriptionId }),
    updatedAt: new Date(),
  };
  await db.transaction(async (tx) => {
    await tx.insert(schema.subscriptions).values({ organizationId: input.orgId, ...values }).onConflictDoUpdate({ target: schema.subscriptions.organizationId, set: values });
    // A paid plan ends the trial; canceling drops back to free.
    const plan: Plan = input.status === "canceled" ? "free" : input.plan;
    await tx.update(schema.organizations).set({ plan, trialEndsAt: plan === "free" ? undefined : null, updatedAt: new Date() }).where(eq(schema.organizations.id, input.orgId));
    await audit({ orgId: input.orgId, actorId: input.actorId ?? null, entity: "billing", action: "subscription", after: values }, tx);
  });
}

const local: BillingProvider = {
  name: "local",
  async checkout({ orgId, plan, userId }) {
    const limits = await getLimits(plan);
    const seats = await activeSeats(orgId);
    if (limits.maxSeats != null && seats > limits.maxSeats)
      throw new ActionError(`The ${plan} plan allows ${limits.maxSeats} seat(s); you have ${seats} active members.`);
    const periodEnd = new Date(Date.now() + 30 * 86_400_000);
    await applySubscription({ orgId, plan, status: plan === "free" ? "canceled" : "active", seats, periodEnd: plan === "free" ? null : periodEnd, actorId: userId });
    if (plan !== "free")
      await db.insert(schema.invoices).values({ organizationId: orgId, amount: limits.pricePerSeat * seats, status: "paid", periodStart: new Date(), externalId: `local_${Date.now()}` });
    await notify(userId, orgId, `Plan changed to ${plan}`, undefined, "/settings/billing");
    return null;
  },
  async portal() {
    return null;
  },
  async cancel(orgId) {
    await db.update(schema.subscriptions).set({ status: "canceled", updatedAt: new Date() }).where(eq(schema.subscriptions.organizationId, orgId));
  },
};

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

export const priceIdFor = (plan: Plan) => (plan === "pro" ? process.env.STRIPE_PRICE_PRO : plan === "business" ? process.env.STRIPE_PRICE_BUSINESS : undefined);

const stripeProvider = (stripe: Stripe): BillingProvider => ({
  name: "stripe",
  async checkout({ orgId, plan, email }) {
    const [sub] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.organizationId, orgId));
    if (plan === "free") {
      if (sub?.stripeSubscriptionId) await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
      await applySubscription({ orgId, plan: "free", status: "canceled" });
      return null;
    }
    const price = priceIdFor(plan);
    if (!price) throw new Error(`Missing STRIPE_PRICE_${plan.toUpperCase()}`);
    if (sub?.stripeSubscriptionId) return (await this.portal(orgId))!; // plan switches go through the portal
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: sub?.stripeCustomerId ?? undefined,
      customer_email: sub?.stripeCustomerId ? undefined : email,
      line_items: [{ price, quantity: await activeSeats(orgId) }],
      client_reference_id: orgId,
      metadata: { orgId, plan },
      subscription_data: { metadata: { orgId, plan } },
      success_url: `${appUrl()}/settings/billing?checkout=success`,
      cancel_url: `${appUrl()}/settings/billing?checkout=cancel`,
    });
    return session.url;
  },
  async portal(orgId) {
    const [sub] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.organizationId, orgId));
    if (!sub?.stripeCustomerId) return null;
    const s = await stripe.billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: `${appUrl()}/settings/billing` });
    return s.url;
  },
  async cancel(orgId) {
    const [sub] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.organizationId, orgId));
    if (sub?.stripeSubscriptionId) await stripe.subscriptions.cancel(sub.stripeSubscriptionId).catch(() => undefined);
  },
});

export function billingProvider(): BillingProvider {
  const stripe = stripeClient();
  return stripe && process.env.STRIPE_PRICE_PRO && process.env.STRIPE_PRICE_BUSINESS ? stripeProvider(stripe) : local;
}
