import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { Users } from "lucide-react";
import { db, schema } from "@/db";
import { requirePage } from "@/lib/auth";
import { parseRange } from "@/lib/queries";
import { money } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/rights";
import { Avatar, Badge, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { RangePicker } from "@/components/range-picker";

export const metadata = { title: "Team · Pulse Sales" };

const { members: m, users: u, sales: s } = schema;

export default async function TeamPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const t = await requirePage("SALES_VIEW_ALL");
  const range = parseRange(sp);

  const rows = await db
    .select({
      id: u.id,
      name: u.name,
      email: u.email,
      role: m.role,
      status: m.status,
      count: sql<number>`count(${s.id})`.mapWith(Number),
      revenue: sql<number>`coalesce(sum(${s.total}), 0)`.mapWith(Number),
    })
    .from(m)
    .innerJoin(u, eq(u.id, m.userId))
    .leftJoin(
      s,
      and(eq(s.repId, u.id), eq(s.organizationId, t.org.id), isNull(s.deletedAt), eq(s.status, "completed"), gte(s.saleDate, range.from), lte(s.saleDate, range.to)),
    )
    .where(eq(m.organizationId, t.org.id))
    .groupBy(u.id, u.name, u.email, m.role, m.status)
    .orderBy(sql`7 desc`);

  const total = rows.reduce((a, r) => a + r.revenue, 0);

  return (
    <>
      <PageHeader title="Team" description={`Rep performance · ${range.label}`} actions={<RangePicker current={range.key} from={range.from} to={range.to} />} />
      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={Users} title="No team members" description="Invite people from Team & rights." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Member</Th>
                <Th>Role</Th>
                <Th className="text-right">Sales</Th>
                <Th className="text-right">Revenue</Th>
                <Th className="text-right">Avg. order</Th>
                <Th className="w-40">Share</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const share = total ? (r.revenue / total) * 100 : 0;
                return (
                  <tr key={r.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={r.name} size="sm" />
                        <div>
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-muted">{r.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Badge tone="primary">{ROLE_LABEL[r.role]}</Badge> {r.status === "inactive" && <Badge>inactive</Badge>}
                    </Td>
                    <Td className="tabular text-right">{r.count}</Td>
                    <Td className="tabular text-right font-medium">{money(r.revenue, t.org.currency)}</Td>
                    <Td className="tabular text-right text-muted">{money(r.count ? r.revenue / r.count : 0, t.org.currency)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-surface-2">
                          <div className="h-1.5 rounded-full bg-accent" style={{ width: `${share}%` }} />
                        </div>
                        <span className="tabular w-10 text-right text-xs text-muted">{share.toFixed(0)}%</span>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
