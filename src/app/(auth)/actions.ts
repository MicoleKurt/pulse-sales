"use server";

import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { formAction, type ActionState } from "@/lib/action";
import { ActionError, createSession, destroySession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { newToken, sha256 } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { audit, createOrganization, notify, sendMail } from "@/lib/services";

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";
const email = z.string().trim().toLowerCase().email("Enter a valid email");
const password = z.string().min(8, "At least 8 characters").max(200);

async function findUserByEmail(e: string) {
  const [u] = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = ${e}`);
  return u;
}

const loginImpl = formAction(z.object({ email, password: z.string().min(1, "Required"), next: z.string().optional() }), async (d) => {
  await rateLimit("login", 10);
  const user = await findUserByEmail(d.email);
  if (!user || !(await verifyPassword(d.password, user.passwordHash))) throw new ActionError("Incorrect email or password.");
  if (user.disabled) throw new ActionError("This account has been disabled.");
  await createSession(user.id);
  redirect(d.next?.startsWith("/") ? d.next : "/dashboard");
});

const signupImpl = formAction(
  z.object({ name: z.string().trim().min(2, "Enter your name").max(80), email, password, invite: z.string().optional() }),
  async (d) => {
    await rateLimit("signup", 5);
    if (await findUserByEmail(d.email)) throw new ActionError("An account with that email already exists. Sign in instead.");
    const [user] = await db
      .insert(schema.users)
      .values({ name: d.name, email: d.email, passwordHash: await hashPassword(d.password) })
      .returning();
    await createSession(user!.id);
    if (d.invite) redirect(`/invite/${d.invite}`);
    redirect("/onboarding");
  },
);

export async function logout() {
  await destroySession();
  redirect("/login");
}

const createOrgImpl = formAction(
  z.object({
    name: z.string().trim().min(2, "Enter a company name").max(80),
    currency: z.enum(["USD", "EUR", "GBP", "PHP", "AUD", "CAD", "SGD", "JPY"]),
    taxRate: z.coerce.number().min(0).max(50),
  }),
  async (d) => {
    const s = await requireUser();
    await db.transaction((tx) => createOrganization({ ...d, ownerId: s.user.id }, tx));
    redirect("/dashboard");
  },
);

const requestResetImpl = formAction(z.object({ email }), async (d) => {
  await rateLimit("reset", 5);
  const user = await findUserByEmail(d.email);
  if (user) {
    const token = newToken();
    await db.insert(schema.passwordResets).values({ id: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 3_600_000) });
    await sendMail(user.email, "Reset your Pulse Sales password", `Reset link (valid 1 hour): ${appUrl()}/reset-password?token=${token}`);
  }
  // Same response either way so emails can't be enumerated.
  return { ok: true, message: "If that email has an account, a reset link is on its way. (Locally: check the server console or Admin → Emails.)" };
});

const resetPasswordImpl = formAction(z.object({ token: z.string().min(10), password }), async (d) => {
  await rateLimit("reset", 10);
  const [row] = await db
    .select()
    .from(schema.passwordResets)
    .where(and(eq(schema.passwordResets.id, sha256(d.token)), gt(schema.passwordResets.expiresAt, new Date()), isNull(schema.passwordResets.usedAt)));
  if (!row) throw new ActionError("This reset link is invalid or has expired.");
  await db.transaction(async (tx) => {
    await tx.update(schema.users).set({ passwordHash: await hashPassword(d.password), updatedAt: new Date() }).where(eq(schema.users.id, row.userId));
    await tx.update(schema.passwordResets).set({ usedAt: new Date() }).where(eq(schema.passwordResets.id, row.id));
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, row.userId));
  });
  await createSession(row.userId);
  redirect("/dashboard");
});

const acceptInviteImpl = formAction(z.object({ token: z.string().min(10) }), async (d) => {
  const s = await requireUser();
  const [inv] = await db
    .select()
    .from(schema.invitations)
    .where(and(eq(schema.invitations.tokenHash, sha256(d.token)), gt(schema.invitations.expiresAt, new Date()), isNull(schema.invitations.acceptedAt)));
  if (!inv) throw new ActionError("This invitation is invalid or has expired.");
  if (inv.email.toLowerCase() !== s.user.email.toLowerCase())
    throw new ActionError(`This invitation was sent to ${inv.email}. Sign in with that account to accept it.`);

  await db.transaction(async (tx) => {
    await tx
      .insert(schema.members)
      .values({ organizationId: inv.organizationId, userId: s.user.id, role: inv.role })
      .onConflictDoUpdate({ target: [schema.members.organizationId, schema.members.userId], set: { role: inv.role, status: "active" } });
    await tx.update(schema.invitations).set({ acceptedAt: new Date() }).where(eq(schema.invitations.id, inv.id));
    await tx.update(schema.users).set({ lastOrgId: inv.organizationId }).where(eq(schema.users.id, s.user.id));
    await audit({ orgId: inv.organizationId, actorId: s.user.id, entity: "member", entityId: s.user.id, action: "join", after: { role: inv.role } }, tx);
  });
  if (inv.invitedBy) await notify(inv.invitedBy, inv.organizationId, `${s.user.name} joined your team`, undefined, "/rights");
  redirect("/dashboard");
});

export async function login(prev: ActionState, form: FormData) {
  return loginImpl(prev, form);
}

export async function signup(prev: ActionState, form: FormData) {
  return signupImpl(prev, form);
}

export async function createOrg(prev: ActionState, form: FormData) {
  return createOrgImpl(prev, form);
}

export async function requestReset(prev: ActionState, form: FormData) {
  return requestResetImpl(prev, form);
}

export async function resetPassword(prev: ActionState, form: FormData) {
  return resetPasswordImpl(prev, form);
}

export async function acceptInvite(prev: ActionState, form: FormData) {
  return acceptInviteImpl(prev, form);
}
