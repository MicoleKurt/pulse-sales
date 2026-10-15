import Link from "next/link";
import { and, count, desc, eq, ilike, sql } from "drizzle-orm";
import { Building2 } from "lucide-react";
import { db, schema } from "@/db";
import { date } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { FilterBar, Pagination, filterSelect, pageOf } from "@/components/list-controls";

const o = schema.organizations;

export default async function AdminOrgsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { offset, limit } = pageOf(sp);
  const where = and(
    sp.q ? ilike(o.name, `%${sp.q}%`) : undefined,
    sp.plan ? eq(o.plan, sp.plan as "free") : undefined,
    sp.status ? eq(o.status, sp.status as "active") : undefined,
  );
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({
        id: o.id,
        name: o.name,
        plan: o.plan,
        status: o.status,
        trialEndsAt: o.trialEndsAt,
        createdAt: o.createdAt,
        members: sql<number>`(select count(*) from organization_members m where m.organization_id = ${o.id} and m.status = 'active')`.mapWith(Number),
        sales: sql<number>`(select count(*) from sales s where s.organization_id = ${o.id} and s.deleted_at is null)`.mapWith(Number),
        subStatus: schema.subscriptions.status,
      })
      .from(o)
      .leftJoin(schema.subscriptions, eq(schema.subscriptions.organizationId, o.id))
      .where(where)
      .orderBy(desc(o.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ n: count() }).from(o).where(where),
  ]);
  const now = new Date();

  return (
    <>
      <PageHeader title="Organizations" description={`${n} workspace${n === 1 ? "" : "s"}`} />
      <Card>
        <FilterBar q={sp.q} placeholder="Search by name">
          <select name="plan" defaultValue={sp.plan ?? ""} className={filterSelect} aria-label="Plan">
            <option value="">All plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
          <select name="status" defaultValue={sp.status ?? ""} className={filterSelect} aria-label="Status">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </FilterBar>
        {rows.length === 0 ? (
          <EmptyState icon={Building2} title="No organizations" description="Workspaces appear here when users sign up." />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Organization</Th>
                  <Th>Plan</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Members</Th>
                  <Th className="text-right">Sales</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-2/50">
                    <Td><Link href={`/admin/organizations/${r.id}`} className="font-medium text-primary hover:underline">{r.name}</Link></Td>
                    <Td>
                      <Badge tone={r.plan === "free" ? "neutral" : "primary"}>{r.plan}</Badge>{" "}
                      {r.plan === "free" && r.trialEndsAt && r.trialEndsAt > now && <Badge tone="accent">trial</Badge>}
                      {r.subStatus === "past_due" && <Badge tone="danger">past due</Badge>}
                    </Td>
                    <Td><Badge tone={r.status === "active" ? "success" : "danger"}>{r.status}</Badge></Td>
                    <Td className="tabular text-right">{r.members}</Td>
                    <Td className="tabular text-right">{r.sales}</Td>
                    <Td className="text-muted">{date(r.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination base="/admin/organizations" sp={sp} total={n} />
          </>
        )}
      </Card>
    </>
  );
}
