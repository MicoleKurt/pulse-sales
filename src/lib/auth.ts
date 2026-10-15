import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema } from "@/db";
import { newToken, sha256 } from "./crypto";
import { ALL_RIGHTS, type Right } from "./rights";
import type { Role, Plan } from "@/db/schema";

const COOKIE = "pulse_session";
const SESSION_DAYS = 30;

export const hashPassword = (pw: string) => bcrypt.hash(pw, 11);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function createSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(COOKIE);
}

export const getSession = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ session: schema.sessions, user: schema.users, platformRole: schema.platformAdmins.role })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .leftJoin(schema.platformAdmins, eq(schema.platformAdmins.userId, schema.users.id))
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date())));
  if (!row || row.user.disabled) return null;
  return row;
});

export async function requireUser() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function requirePlatformAdmin() {
  const s = await requireUser();
  if (!s.platformRole) redirect("/dashboard");
  return s;
}

export type Tenant = {
  user: typeof schema.users.$inferSelect;
  org: typeof schema.organizations.$inferSelect;
  role: Role;
  rights: Set<Right>;
  plan: Plan;
  impersonating: boolean;
  platformRole: "super" | "support" | null;
  can: (r: Right) => boolean;
};

/** Resolves the active organization for the signed-in user. Every tenant query is scoped by tenant.org.id. */
export const getTenant = cache(async (): Promise<Tenant> => {
  const s = await requireUser();
  const impersonating = !!s.session.impersonatingOrgId && !!s.platformRole;

  let org: typeof schema.organizations.$inferSelect | undefined;
  let role: Role = "rep";

  if (impersonating) {
    [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, s.session.impersonatingOrgId!));
    role = "owner";
  } else {
    const memberships = await db
      .select({ org: schema.organizations, role: schema.members.role })
      .from(schema.members)
      .innerJoin(schema.organizations, eq(schema.organizations.id, schema.members.organizationId))
      .where(and(eq(schema.members.userId, s.user.id), eq(schema.members.status, "active")));
    const pick = memberships.find((m) => m.org.id === s.user.lastOrgId) ?? memberships[0];
    if (!pick) redirect(s.platformRole ? "/admin" : "/onboarding");
    org = pick.org;
    role = pick.role;
  }
  if (!org) redirect("/onboarding");

  const rows = await db
    .select()
    .from(schema.roleRights)
    .where(and(eq(schema.roleRights.organizationId, org.id), eq(schema.roleRights.role, role)));
  // Owners always hold every right; impersonation is read-only (enforced in mutations).
  const rights = new Set<Right>(role === "owner" ? ALL_RIGHTS : rows.filter((r) => r.allowed).map((r) => r.right as Right));

  const plan = effectivePlan(org);
  return {
    user: s.user,
    org,
    role,
    rights,
    plan,
    impersonating,
    platformRole: s.platformRole,
    can: (r) => rights.has(r),
  };
});

export function effectivePlan(org: { plan: Plan; trialEndsAt: Date | null }): Plan {
  if (org.trialEndsAt && org.trialEndsAt > new Date() && org.plan === "free") return "pro";
  return org.plan;
}

export class ActionError extends Error {}

/** Guard for pages: sends users without the right back to the dashboard. */
export async function requirePage(right: Right) {
  const t = await getTenant();
  if (!t.can(right)) redirect("/dashboard?denied=1");
  return t;
}

/** Guard for server actions: right check, suspension and read-only impersonation. */
export async function requireRight(right: Right) {
  const t = await getTenant();
  if (t.impersonating) throw new ActionError("Impersonation is read-only.");
  if (t.org.status === "suspended") throw new ActionError("This organization is suspended. Contact support.");
  if (!t.can(right)) throw new ActionError("You don't have permission to do that.");
  return t;
}

export async function findMembership(userId: string, orgId: string) {
  const [m] = await db
    .select()
    .from(schema.members)
    .where(and(eq(schema.members.userId, userId), eq(schema.members.organizationId, orgId)));
  return m;
}
