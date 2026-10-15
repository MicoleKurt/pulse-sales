import type Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Plan } from "@/db/schema";
import { applySubscription, stripeClient } from "@/lib/billing";
import { notify } from "@/lib/services";

const PLAN_BY_PRICE = () => ({
  [process.env.STRIPE_PRICE_PRO ?? "_pro"]: "pro" as Plan,
  [process.env.STRIPE_PRICE_BUSINESS ?? "_biz"]: "business" as Plan,
});

const statusMap: Record<string, string> = { active: "active", trialing: "trialing", past_due: "past_due", unpaid: "past_due", canceled: "canceled", incomplete_expired: "canceled" };

export async function POST(req: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return new Response("Stripe not configured", { status: 501 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Idempotency: each Stripe event is processed once.
  const inserted = await db
    .insert(schema.webhookEvents)
    .values({ id: event.id, provider: "stripe", type: event.type, payload: event as unknown as Record<string, unknown> })
    .onConflictDoNothing()
    .returning();
  if (!inserted.length) return Response.json({ received: true, duplicate: true });

  try {
    await handle(event);
    await db.update(schema.webhookEvents).set({ processedAt: new Date() }).where(eq(schema.webhookEvents.id, event.id));
  } catch (e) {
    await db.update(schema.webhookEvents).set({ error: String(e) }).where(eq(schema.webhookEvents.id, event.id));
    return new Response("Handler error", { status: 500 });
  }
  return Response.json({ received: true });
}

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const orgId = s.metadata?.orgId ?? s.client_reference_id;
      if (!orgId) return;
      await applySubscription({
        orgId,
        plan: (s.metadata?.plan as Plan) ?? "pro",
        status: "active",
        stripeCustomerId: typeof s.customer === "string" ? s.customer : (s.customer?.id ?? null),
        stripeSubscriptionId: typeof s.subscription === "string" ? s.subscription : (s.subscription?.id ?? null),
      });
      return;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata?.orgId;
      if (!orgId) return;
      const item = sub.items.data[0];
      const plan = PLAN_BY_PRICE()[item?.price.id ?? ""] ?? (sub.metadata?.plan as Plan) ?? "pro";
      const end = (item as unknown as { current_period_end?: number })?.current_period_end;
      await applySubscription({
        orgId,
        plan,
        status: event.type === "customer.subscription.deleted" ? "canceled" : (statusMap[sub.status] ?? sub.status),
        seats: item?.quantity ?? undefined,
        periodEnd: end ? new Date(end * 1000) : null,
        stripeSubscriptionId: sub.id,
      });
      return;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const customer = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
      if (!customer) return;
      const [sub] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.stripeCustomerId, customer));
      if (!sub) return;
      const failed = event.type === "invoice.payment_failed";
      await db.insert(schema.invoices).values({
        organizationId: sub.organizationId,
        amount: (failed ? inv.amount_due : inv.amount_paid) / 100,
        status: failed ? "failed" : "paid",
        periodStart: new Date(inv.period_start * 1000),
        externalId: inv.id,
      });
      if (failed) {
        await db.update(schema.subscriptions).set({ status: "past_due" }).where(eq(schema.subscriptions.organizationId, sub.organizationId));
        const owners = await db.select({ userId: schema.members.userId }).from(schema.members).where(and(eq(schema.members.organizationId, sub.organizationId), eq(schema.members.role, "owner")));
        await Promise.all(owners.map((o) => notify(o.userId, sub.organizationId, "Payment failed", "Update your card to keep your plan.", "/settings/billing")));
      }
      return;
    }
  }
}
