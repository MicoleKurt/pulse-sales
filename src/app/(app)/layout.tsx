import { and, count, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { getTenant } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const t = await getTenant();
  const now = new Date();

  const [orgs, [unread], notifications, announcements] = await Promise.all([
    db
      .select({ id: schema.organizations.id, name: schema.organizations.name })
      .from(schema.members)
      .innerJoin(schema.organizations, eq(schema.organizations.id, schema.members.organizationId))
      .where(and(eq(schema.members.userId, t.user.id), eq(schema.members.status, "active"))),
    db
      .select({ n: count() })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, t.user.id), isNull(schema.notifications.readAt))),
    db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, t.user.id))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(8),
    db
      .select()
      .from(schema.announcements)
      .where(
        and(
          or(isNull(schema.announcements.organizationId), eq(schema.announcements.organizationId, t.org.id)),
          lte(schema.announcements.startsAt, now),
          or(isNull(schema.announcements.endsAt), gt(schema.announcements.endsAt, now)),
        ),
      )
      .orderBy(desc(schema.announcements.createdAt))
      .limit(2),
  ]);

  const trialDaysLeft = t.org.plan === "free" && t.org.trialEndsAt && t.org.trialEndsAt > now
    ? Math.ceil((t.org.trialEndsAt.getTime() - now.getTime()) / 86_400_000)
    : null;

  return (
    <AppShell
      user={{ name: t.user.name, email: t.user.email }}
      org={{ id: t.org.id, name: t.org.name, status: t.org.status }}
      orgs={orgs}
      rights={[...t.rights]}
      plan={t.plan}
      trialDaysLeft={trialDaysLeft}
      impersonating={t.impersonating}
      isPlatformAdmin={!!t.platformRole}
      unread={unread?.n ?? 0}
      notifications={notifications.map((n) => ({ id: n.id, title: n.title, body: n.body, href: n.href, read: !!n.readAt, createdAt: n.createdAt.toISOString() }))}
      announcements={announcements.map((a) => ({ id: a.id, message: a.message, tone: a.tone }))}
    >
      {children}
    </AppShell>
  );
}
