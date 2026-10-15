import { count, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Card, PageHeader } from "@/components/ui";
import { Pagination, pageOf } from "@/components/list-controls";
import { AuditTable } from "@/components/audit-table";

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { offset, limit } = pageOf(sp);
  const where = eq(schema.auditLog.scope, "platform");
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({ log: schema.auditLog, actor: schema.users.name, org: schema.organizations.name })
      .from(schema.auditLog)
      .leftJoin(schema.users, eq(schema.users.id, schema.auditLog.actorId))
      .leftJoin(schema.organizations, eq(schema.organizations.id, schema.auditLog.organizationId))
      .where(where)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ n: count() }).from(schema.auditLog).where(where),
  ]);
  return (
    <>
      <PageHeader title="Platform audit" description="Every action taken by platform admins: suspensions, plan changes, impersonation and more." />
      <Card>
        <AuditTable showOrg rows={rows.map((r) => ({ ...r.log, actor: r.actor, org: r.org }))} />
        <Pagination base="/admin/audit" sp={sp} total={n} />
      </Card>
    </>
  );
}
