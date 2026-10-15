import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { ArrowLeft, DollarSign, Eye, ShoppingCart, Users } from "lucide-react";
import { z } from "zod";
import { db, schema } from "@/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { date, dateTime, money } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/rights";
import { Badge, Card, CardHeader, PageHeader, Stat, Table, Td, Th } from "@/components/ui";
import { ActionButton } from "@/components/form";
import { AuditTable } from "@/components/audit-table";
import { extendTrial, impersonate, setOrgPlan, setOrgStatus } from "../../actions";

export default async function AdminOrgPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const s = await requirePlatformAdmin();
  const isSuper = s.platformRole === "super";
  const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, id));
  if (!org) notFound();

  const [members, [sub], [usage], invoices, logs] = await Promise.all([
    db
      .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.members.role, status: schema.members.status })
      .from(schema.members)
      .innerJoin(schema.users, eq(schema.users.id, schema.members.userId))
      .where(eq(schema.members.organizationId, id)),
    db.select().from(schema.subscriptions).where(eq(schema.subscriptions.organizationId, id)),
    db
      .select({
        sales: sql<number>`count(*)`.mapWith(Number),
        revenue: sql<number>`coalesce(sum(${schema.sales.total}), 0)`.mapWith(Number),
        last30: sql<number>`count(*) filter (where ${schema.sales.createdAt} > now() - interval '30 days')`.mapWith(Number),
      })
      .from(schema.sales)
      .where(and(eq(schema.sales.organizationId, id), isNull(schema.sales.deletedAt))),
    db.select().from(schema.invoices).where(eq(schema.invoices.organizationId, id)).orderBy(desc(schema.invoices.createdAt)).limit(10),
    db
      .select({ log: schema.auditLog, actor: schema.users.name })
      .from(schema.auditLog)
      .leftJoin(schema.users, eq(schema.users.id, schema.auditLog.actorId))
      .where(eq(schema.auditLog.organizationId, id))
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(15),
  ]);
  const trial = org.plan === "free" && org.trialEndsAt && org.trialEndsAt > new Date();

  return (
    <>
      <Link href="/admin/organizations" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Organizations
      </Link>
      <PageHeader
        title={org.name}
        description={`${org.slug} · created ${date(org.createdAt)} · ${org.currency}`}
        actions={
          <>
            <ActionButton action={impersonate} fields={{ id }} size="md">
              <Eye className="size-4" /> View as (read-only)
            </ActionButton>
            {isSuper && (
              <ActionButton
                action={setOrgStatus}
                fields={{ id, status: org.status === "active" ? "suspended" : "active" }}
                variant={org.status === "active" ? "danger" : "primary"}
                size="md"
                confirm={org.status === "active" ? `Suspend ${org.name}? Members lose write access.` : undefined}
              >
                {org.status === "active" ? "Suspend" : "Reactivate"}
              </ActionButton>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-muted">Plan</p>
          <p className="mt-1 text-xl font-semibold capitalize">{org.plan}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge tone={org.status === "active" ? "success" : "danger"}>{org.status}</Badge>
            {trial && <Badge tone="accent">trial until {date(org.trialEndsAt)}</Badge>}
            {sub && <Badge>{sub.status}</Badge>}
          </div>
        </Card>
        <Stat label="Members" value={String(members.filter((m) => m.status === "active").length)} icon={Users} />
        <Stat label="Sales (30d / all)" value={`${usage!.last30} / ${usage!.sales}`} icon={ShoppingCart} />
        <Stat label="Sales volume" value={money(usage!.revenue, org.currency)} icon={DollarSign} />
      </div>

      {isSuper && (
        <Card className="mt-4">
          <CardHeader title="Subscription controls" description="Changes are applied immediately and logged to the platform audit." />
          <div className="flex flex-wrap items-center gap-2 p-5">
            {(["free", "pro", "business"] as const).map((p) => (
              <ActionButton key={p} action={setOrgPlan} fields={{ id, plan: p }} variant={org.plan === p ? "primary" : "secondary"} confirm={`Set ${org.name} to ${p}?`}>
                Set {p}
              </ActionButton>
            ))}
            <span className="mx-2 h-6 w-px bg-border" />
            {[7, 14, 30].map((d) => (
              <ActionButton key={d} action={extendTrial} fields={{ id, days: String(d) }}>
                +{d}d trial
              </ActionButton>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Members" />
          <Table>
            <thead>
              <tr><Th>Name</Th><Th>Role</Th><Th>Status</Th></tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <Td><p className="font-medium">{m.name}</p><p className="text-xs text-muted">{m.email}</p></Td>
                  <Td>{ROLE_LABEL[m.role]}</Td>
                  <Td><Badge tone={m.status === "active" ? "success" : "neutral"}>{m.status}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Invoices" />
          <Table>
            <thead>
              <tr><Th>Date</Th><Th>Status</Th><Th className="text-right">Amount</Th></tr>
            </thead>
            <tbody>
              {invoices.length === 0 && <tr><Td colSpan={3} className="py-8 text-center text-muted">No invoices.</Td></tr>}
              {invoices.map((i) => (
                <tr key={i.id}>
                  <Td>{dateTime(i.createdAt)}</Td>
                  <Td><Badge tone={i.status === "paid" ? "success" : "danger"}>{i.status}</Badge></Td>
                  <Td className="tabular text-right">{money(i.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Recent activity" />
        <AuditTable rows={logs.map((l) => ({ ...l.log, actor: l.actor }))} />
      </Card>
    </>
  );
}
