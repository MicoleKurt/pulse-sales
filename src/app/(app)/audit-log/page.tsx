import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { Lock } from "lucide-react";
import { db, schema } from "@/db";
import { requirePage } from "@/lib/auth";
import { getLimits } from "@/lib/services";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { Pagination, filterSelect, pageOf } from "@/components/list-controls";
import { AuditTable } from "@/components/audit-table";

export const metadata = { title: "Audit log · Pulse Sales" };

const ENTITIES = ["sale", "customer", "product", "price", "member", "invitation", "rights", "organization", "customers", "products", "billing"];
const ACTIONS = ["create", "update", "delete", "restore", "purge", "import", "export", "join", "remove", "revoke"];

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const t = await requirePage("AUDIT_VIEW");
  const limits = await getLimits(t.plan);
  if (!limits.auditLog)
    return (
      <>
        <PageHeader title="Audit log" />
        <Card>
          <EmptyState
            icon={Lock}
            title="Audit log is on Business"
            description="Every change is being recorded. Upgrade to Business to browse the full history."
            action={t.can("BILLING_ADMIN") ? <LinkButton href="/settings/billing">See plans</LinkButton> : undefined}
          />
        </Card>
      </>
    );

  const { offset, limit } = pageOf(sp);
  const where = and(
    eq(schema.auditLog.organizationId, t.org.id),
    eq(schema.auditLog.scope, "tenant"),
    sp.entity ? eq(schema.auditLog.entity, sp.entity) : undefined,
    sp.action ? eq(schema.auditLog.action, sp.action) : undefined,
    sp.actor ? eq(schema.auditLog.actorId, sp.actor) : undefined,
    sp.from ? gte(schema.auditLog.createdAt, new Date(sp.from + "T00:00:00")) : undefined,
    sp.to ? lte(schema.auditLog.createdAt, new Date(sp.to + "T23:59:59")) : undefined,
  );
  const [rows, [{ n }], actors] = await Promise.all([
    db
      .select({ log: schema.auditLog, actor: schema.users.name })
      .from(schema.auditLog)
      .leftJoin(schema.users, eq(schema.users.id, schema.auditLog.actorId))
      .where(where)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ n: count() }).from(schema.auditLog).where(where),
    db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.members)
      .innerJoin(schema.users, eq(schema.users.id, schema.members.userId))
      .where(eq(schema.members.organizationId, t.org.id)),
  ]);

  return (
    <>
      <PageHeader title="Audit log" description="Every change in this workspace: who, what and when. Click a row for the diff." />
      <Card>
        <form className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <select name="entity" defaultValue={sp.entity ?? ""} className={filterSelect} aria-label="Entity">
            <option value="">All entities</option>
            {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select name="action" defaultValue={sp.action ?? ""} className={filterSelect} aria-label="Action">
            <option value="">All actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select name="actor" defaultValue={sp.actor ?? ""} className={filterSelect} aria-label="User">
            <option value="">All users</option>
            {actors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input type="date" name="from" defaultValue={sp.from} className={filterSelect} aria-label="From" />
          <input type="date" name="to" defaultValue={sp.to} className={filterSelect} aria-label="To" />
          <button className="h-9 rounded-lg border border-border bg-surface px-3 text-sm font-medium hover:bg-surface-2">Apply</button>
        </form>
        <AuditTable rows={rows.map((r) => ({ ...r.log, actor: r.actor }))} />
        <Pagination base="/audit-log" sp={sp} total={n} />
      </Card>
    </>
  );
}
