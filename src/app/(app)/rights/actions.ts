"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { ActionError, requireRight } from "@/lib/auth";
import { formAction, guarded, type ActionState } from "@/lib/action";
import { newToken, sha256 } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { ALL_RIGHTS, ROLE_LABEL } from "@/lib/rights";
import { assertCanAddSeat, audit, notify, sendMail } from "@/lib/services";
import { appUrl } from "@/lib/url";

const role = z.enum(["owner", "admin", "manager", "rep"]);

const inviteMemberImpl = formAction(z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email"), role }), async (d) => {
  const t = await requireRight("TEAM_ADMIN");
  await rateLimit("invite", 20);
  if (d.role === "owner" && t.role !== "owner") throw new ActionError("Only owners can invite owners.");
  await assertCanAddSeat(t);

  const [existing] = await db
    .select({ id: schema.members.id })
    .from(schema.members)
    .innerJoin(schema.users, eq(schema.users.id, schema.members.userId))
    .where(and(eq(schema.members.organizationId, t.org.id), sql`lower(${schema.users.email}) = ${d.email}`, eq(schema.members.status, "active")));
  if (existing) throw new ActionError("That person is already a member.");

  const token = newToken();
  await db
    .update(schema.invitations)
    .set({ expiresAt: new Date() })
    .where(and(eq(schema.invitations.organizationId, t.org.id), eq(schema.invitations.email, d.email), isNull(schema.invitations.acceptedAt)));
  const [inv] = await db
    .insert(schema.invitations)
    .values({ organizationId: t.org.id, email: d.email, role: d.role, tokenHash: sha256(token), invitedBy: t.user.id, expiresAt: new Date(Date.now() + 7 * 86_400_000) })
    .returning();
  const link = `${appUrl()}/invite/${token}`;
  await sendMail(d.email, `${t.user.name} invited you to ${t.org.name} on Pulse Sales`, `Join as ${ROLE_LABEL[d.role]}: ${link} (expires in 7 days)`);
  await audit({ orgId: t.org.id, actorId: t.user.id, entity: "invitation", entityId: inv!.id, action: "create", after: { email: d.email, role: d.role } });

  // If they already have an account, ping them in-app too.
  const [u] = await db.select({ id: schema.users.id }).from(schema.users).where(sql`lower(${schema.users.email}) = ${d.email}`);
  if (u) await notify(u.id, null, `You're invited to ${t.org.name}`, `Join as ${ROLE_LABEL[d.role]}`, `/invite/${token}`);

  revalidatePath("/rights");
  return { ok: true, message: `Invitation sent. Link (also in Admin → Emails): ${link}` };
});

export async function revokeInvite(_: unknown, form: FormData) {
  return guarded(async () => {
    const t = await requireRight("TEAM_ADMIN");
    const id = z.string().uuid().parse(form.get("id"));
    await db.delete(schema.invitations).where(and(eq(schema.invitations.id, id), eq(schema.invitations.organizationId, t.org.id)));
    await audit({ orgId: t.org.id, actorId: t.user.id, entity: "invitation", entityId: id, action: "revoke" });
    revalidatePath("/rights");
  });
}

async function ownerCount(orgId: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.members)
    .where(and(eq(schema.members.organizationId, orgId), eq(schema.members.role, "owner"), eq(schema.members.status, "active")));
  return n;
}

export async function updateMember(_: unknown, form: FormData) {
  return guarded(async () => {
    const t = await requireRight("TEAM_ADMIN");
    const d = z
      .object({ id: z.string().uuid(), role: role.optional(), status: z.enum(["active", "inactive"]).optional(), remove: z.literal("1").optional() })
      .parse(Object.fromEntries(form));
    const [m] = await db.select().from(schema.members).where(and(eq(schema.members.id, d.id), eq(schema.members.organizationId, t.org.id)));
    if (!m) throw new ActionError("Member not found.");
    if (m.userId === t.user.id) throw new ActionError("You can't change your own membership.");
    if ((m.role === "owner" || d.role === "owner") && t.role !== "owner") throw new ActionError("Only owners can change owners.");
    const losesOwner = m.role === "owner" && (d.remove || d.status === "inactive" || (d.role && d.role !== "owner"));
    if (losesOwner && (await ownerCount(t.org.id)) <= 1) throw new ActionError("A workspace needs at least one active owner.");
    if (d.status === "active" && m.status === "inactive") await assertCanAddSeat(t);

    if (d.remove) {
      await db.delete(schema.members).where(eq(schema.members.id, m.id));
    } else {
      await db
        .update(schema.members)
        .set({ ...(d.role && { role: d.role }), ...(d.status && { status: d.status }), updatedAt: new Date() })
        .where(eq(schema.members.id, m.id));
    }
    await audit({ orgId: t.org.id, actorId: t.user.id, entity: "member", entityId: m.userId, action: d.remove ? "remove" : "update", before: m, after: d });
    if (!d.remove) await notify(m.userId, t.org.id, d.role ? `Your role is now ${ROLE_LABEL[d.role]}` : `Your access was ${d.status === "active" ? "re-activated" : "deactivated"}`);
    revalidatePath("/rights");
  });
}

export async function saveRights(_: unknown, form: FormData) {
  return guarded(async () => {
    const t = await requireRight("TEAM_ADMIN");
    const values = (["admin", "manager", "rep"] as const).flatMap((r) =>
      ALL_RIGHTS.map((right) => ({ organizationId: t.org.id, role: r, right, allowed: form.get(`${r}:${right}`) === "on" })),
    );
    // Admins can't remove their own TEAM_ADMIN right and lock everyone out.
    if (t.role === "admin" && !values.find((v) => v.role === "admin" && v.right === "TEAM_ADMIN")!.allowed)
      throw new ActionError("You can't remove Team admin from your own role.");
    await db.transaction(async (tx) => {
      for (const v of values)
        await tx
          .insert(schema.roleRights)
          .values(v)
          .onConflictDoUpdate({ target: [schema.roleRights.organizationId, schema.roleRights.role, schema.roleRights.right], set: { allowed: v.allowed } });
      await audit({ orgId: t.org.id, actorId: t.user.id, entity: "rights", action: "update", after: values.filter((v) => v.allowed).map((v) => `${v.role}:${v.right}`) }, tx);
    });
    revalidatePath("/", "layout");
    return { ok: true, message: "Rights saved." };
  });
}

export async function inviteMember(prev: ActionState, form: FormData) {
  return inviteMemberImpl(prev, form);
}
