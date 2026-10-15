"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { ActionError, getTenant, hashPassword, requireRight, requireUser, verifyPassword } from "@/lib/auth";
import { formAction, type ActionState } from "@/lib/action";
import { audit } from "@/lib/services";
import { billingProvider } from "@/lib/billing";

const updateOrgImpl = formAction(
  z.object({
    name: z.string().trim().min(2).max(80),
    currency: z.enum(["USD", "EUR", "GBP", "PHP", "AUD", "CAD", "SGD", "JPY"]),
    taxRate: z.coerce.number().min(0).max(50),
  }),
  async (d) => {
    const t = await requireRight("BILLING_ADMIN");
    const [after] = await db.update(schema.organizations).set({ ...d, updatedAt: new Date() }).where(eq(schema.organizations.id, t.org.id)).returning();
    await audit({ orgId: t.org.id, actorId: t.user.id, entity: "organization", entityId: t.org.id, action: "update", before: t.org, after });
    revalidatePath("/", "layout");
    return { ok: true, message: "Workspace updated." };
  },
);

const deleteOrgImpl = formAction(z.object({ confirm: z.string() }), async (d) => {
  const t = await requireRight("BILLING_ADMIN");
  if (t.role !== "owner") throw new ActionError("Only owners can delete a workspace.");
  if (d.confirm !== t.org.name) return { fieldErrors: { confirm: ["Type the workspace name exactly"] }, error: "Name doesn't match." };
  await billingProvider().cancel(t.org.id);
  await db.delete(schema.organizations).where(eq(schema.organizations.id, t.org.id));
  await audit({ orgId: null, actorId: t.user.id, entity: "organization", entityId: t.org.id, action: "delete", before: t.org, scope: "platform" });
  redirect("/dashboard");
});

const changePlanImpl = formAction(z.object({ plan: z.enum(["free", "pro", "business"]) }), async (d) => {
  const t = await requireRight("BILLING_ADMIN");
  const url = await billingProvider().checkout({ orgId: t.org.id, plan: d.plan, userId: t.user.id, email: t.user.email });
  if (url) redirect(url);
  revalidatePath("/", "layout");
  return { ok: true, message: `You're now on the ${d.plan} plan.` };
});

export async function openPortal() {
  const t = await requireRight("BILLING_ADMIN");
  const url = await billingProvider().portal(t.org.id);
  redirect(url ?? "/settings/billing");
}

// ── Profile ───────────────────────────────────────────────
const updateProfileImpl = formAction(
  z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email() }),
  async (d) => {
    const s = await requireUser();
    const [taken] = await db.select({ id: schema.users.id }).from(schema.users).where(and(eq(schema.users.email, d.email), ne(schema.users.id, s.user.id)));
    if (taken) return { fieldErrors: { email: ["Already in use"] }, error: "That email is in use." };
    await db.update(schema.users).set({ ...d, updatedAt: new Date() }).where(eq(schema.users.id, s.user.id));
    revalidatePath("/", "layout");
    return { ok: true, message: "Profile saved." };
  },
);

const changePasswordImpl = formAction(
  z.object({ current: z.string().min(1, "Required"), password: z.string().min(8, "At least 8 characters").max(200) }),
  async (d) => {
    const s = await requireUser();
    if (!(await verifyPassword(d.current, s.user.passwordHash))) return { fieldErrors: { current: ["Incorrect password"] }, error: "Current password is incorrect." };
    await db.update(schema.users).set({ passwordHash: await hashPassword(d.password), updatedAt: new Date() }).where(eq(schema.users.id, s.user.id));
    // Sign out other sessions.
    await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, s.user.id), ne(schema.sessions.id, s.session.id)));
    const t = await getTenant().catch(() => null);
    await audit({ orgId: t?.org.id ?? null, actorId: s.user.id, entity: "user", entityId: s.user.id, action: "password_change" });
    return { ok: true, message: "Password changed. Other devices were signed out." };
  },
);

export async function updateOrg(prev: ActionState, form: FormData) {
  return updateOrgImpl(prev, form);
}

export async function deleteOrg(prev: ActionState, form: FormData) {
  return deleteOrgImpl(prev, form);
}

export async function changePlan(prev: ActionState, form: FormData) {
  return changePlanImpl(prev, form);
}

export async function updateProfile(prev: ActionState, form: FormData) {
  return updateProfileImpl(prev, form);
}

export async function changePassword(prev: ActionState, form: FormData) {
  return changePasswordImpl(prev, form);
}
