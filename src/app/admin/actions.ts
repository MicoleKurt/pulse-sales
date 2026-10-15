"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { ActionError, requirePlatformAdmin } from "@/lib/auth";
import { formAction, guarded, type ActionState } from "@/lib/action";
import { sha256 } from "@/lib/crypto";
import { applySubscription } from "@/lib/billing";
import { audit } from "@/lib/services";

const uuid = z.string().uuid();

async function requireSuper() {
  const s = await requirePlatformAdmin();
  if (s.platformRole !== "super") throw new ActionError("Only super admins can do that.");
  return s;
}

const platformAudit = (actorId: string, entity: string, entityId: string, action: string, after?: unknown, orgId: string | null = null) =>
  audit({ orgId, actorId, entity, entityId, action, after, scope: "platform" });

export async function setOrgStatus(_: unknown, form: FormData) {
  return guarded(async () => {
    const s = await requireSuper();
    const { id, status } = z.object({ id: uuid, status: z.enum(["active", "suspended"]) }).parse(Object.fromEntries(form));
    await db.update(schema.organizations).set({ status, updatedAt: new Date() }).where(eq(schema.organizations.id, id));
    await platformAudit(s.user.id, "organization", id, status === "suspended" ? "suspend" : "reactivate", { status }, id);
    revalidatePath("/admin", "layout");
  });
}

export async function extendTrial(_: unknown, form: FormData) {
  return guarded(async () => {
    const s = await requireSuper();
    const { id, days } = z.object({ id: uuid, days: z.coerce.number().int().min(1).max(90) }).parse(Object.fromEntries(form));
    const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, id));
    if (!org) throw new ActionError("Not found.");
    const base = org.trialEndsAt && org.trialEndsAt > new Date() ? org.trialEndsAt : new Date();
    const trialEndsAt = new Date(base.getTime() + days * 86_400_000);
    await db.update(schema.organizations).set({ trialEndsAt, plan: "free", updatedAt: new Date() }).where(eq(schema.organizations.id, id));
    await platformAudit(s.user.id, "organization", id, "extend_trial", { days, trialEndsAt }, id);
    revalidatePath("/admin", "layout");
  });
}

export async function setOrgPlan(_: unknown, form: FormData) {
  return guarded(async () => {
    const s = await requireSuper();
    const { id, plan } = z.object({ id: uuid, plan: z.enum(["free", "pro", "business"]) }).parse(Object.fromEntries(form));
    await applySubscription({ orgId: id, plan, status: plan === "free" ? "canceled" : "active", periodEnd: plan === "free" ? null : new Date(Date.now() + 30 * 86_400_000), actorId: s.user.id });
    await platformAudit(s.user.id, "organization", id, "comp_plan", { plan }, id);
    revalidatePath("/admin", "layout");
  });
}

/** Read-only "view as": the session points at the org; every mutation is blocked while impersonating. */
export async function impersonate(_: unknown, form: FormData) {
  return guarded(async () => {
    const s = await requirePlatformAdmin();
    const id = uuid.parse(form.get("id"));
    const token = (await cookies()).get("pulse_session")?.value;
    if (!token) throw new ActionError("No session.");
    await db.update(schema.sessions).set({ impersonatingOrgId: id }).where(eq(schema.sessions.id, sha256(token)));
    await platformAudit(s.user.id, "organization", id, "impersonate", undefined, id);
    redirect("/dashboard");
  });
}

export async function setUserDisabled(_: unknown, form: FormData) {
  return guarded(async () => {
    const s = await requireSuper();
    const { id, disabled } = z.object({ id: uuid, disabled: z.enum(["true", "false"]) }).parse(Object.fromEntries(form));
    if (id === s.user.id) throw new ActionError("You can't disable yourself.");
    await db.update(schema.users).set({ disabled: disabled === "true", updatedAt: new Date() }).where(eq(schema.users.id, id));
    if (disabled === "true") await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
    await platformAudit(s.user.id, "user", id, disabled === "true" ? "disable" : "enable");
    revalidatePath("/admin/users");
  });
}

export async function setPlatformRole(_: unknown, form: FormData) {
  return guarded(async () => {
    const s = await requireSuper();
    const { id, role } = z.object({ id: uuid, role: z.enum(["none", "support", "super"]) }).parse(Object.fromEntries(form));
    if (id === s.user.id) throw new ActionError("You can't change your own platform role.");
    if (role === "none") await db.delete(schema.platformAdmins).where(eq(schema.platformAdmins.userId, id));
    else await db.insert(schema.platformAdmins).values({ userId: id, role }).onConflictDoUpdate({ target: schema.platformAdmins.userId, set: { role } });
    await platformAudit(s.user.id, "user", id, "platform_role", { role });
    revalidatePath("/admin/users");
  });
}

const savePlanLimitsImpl = formAction(
  z.object({
    plan: z.enum(["free", "pro", "business"]),
    pricePerSeat: z.coerce.number().min(0).max(10_000),
    maxSeats: z.union([z.literal(""), z.coerce.number().int().min(1)]).transform((v) => (v === "" ? null : v)),
    maxSalesPerMonth: z.union([z.literal(""), z.coerce.number().int().min(1)]).transform((v) => (v === "" ? null : v)),
    exports: z.string().optional().transform((v) => v === "on"),
    auditLog: z.string().optional().transform((v) => v === "on"),
    advancedReports: z.string().optional().transform((v) => v === "on"),
  }),
  async (d) => {
    const s = await requireSuper();
    await db.insert(schema.planLimits).values(d).onConflictDoUpdate({ target: schema.planLimits.plan, set: d });
    await platformAudit(s.user.id, "plan", d.plan, "update", d);
    revalidatePath("/admin/plans");
    return { ok: true, message: `${d.plan} limits saved.` };
  },
);

const createAnnouncementImpl = formAction(
  z.object({
    message: z.string().trim().min(3).max(300),
    orgId: z.union([z.literal(""), uuid]).transform((v) => v || null),
    tone: z.enum(["info", "warning"]).default("info"),
    days: z.coerce.number().int().min(1).max(60).default(7),
  }),
  async (d) => {
    const s = await requirePlatformAdmin();
    const [a] = await db
      .insert(schema.announcements)
      .values({ message: d.message, organizationId: d.orgId, tone: d.tone, endsAt: new Date(Date.now() + d.days * 86_400_000), createdBy: s.user.id })
      .returning();
    await platformAudit(s.user.id, "announcement", a!.id, "create", a, d.orgId);
    revalidatePath("/admin/announcements");
    return { ok: true, message: "Announcement published." };
  },
);

export async function endAnnouncement(_: unknown, form: FormData) {
  return guarded(async () => {
    const s = await requirePlatformAdmin();
    const id = uuid.parse(form.get("id"));
    await db.update(schema.announcements).set({ endsAt: new Date() }).where(eq(schema.announcements.id, id));
    await platformAudit(s.user.id, "announcement", id, "end");
    revalidatePath("/admin/announcements");
  });
}

export async function savePlanLimits(prev: ActionState, form: FormData) {
  return savePlanLimitsImpl(prev, form);
}

export async function createAnnouncement(prev: ActionState, form: FormData) {
  return createAnnouncementImpl(prev, form);
}
