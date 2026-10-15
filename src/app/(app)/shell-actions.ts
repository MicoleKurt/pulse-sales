"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, schema } from "@/db";
import { findMembership, requireUser } from "@/lib/auth";
import { sha256 } from "@/lib/crypto";

export async function switchOrg(orgId: string) {
  const s = await requireUser();
  const m = await findMembership(s.user.id, orgId);
  if (!m || m.status !== "active") return;
  await db.update(schema.users).set({ lastOrgId: orgId }).where(eq(schema.users.id, s.user.id));
  redirect("/dashboard");
}

export async function markNotificationsRead() {
  const s = await requireUser();
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(and(eq(schema.notifications.userId, s.user.id), isNull(schema.notifications.readAt)));
  revalidatePath("/", "layout");
}

export async function stopImpersonating() {
  const s = await requireUser();
  const token = (await cookies()).get("pulse_session")?.value;
  if (token) await db.update(schema.sessions).set({ impersonatingOrgId: null }).where(eq(schema.sessions.id, sha256(token)));
  redirect(s.platformRole ? "/admin/organizations" : "/dashboard");
}
