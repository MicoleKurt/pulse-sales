import { count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { date } from "@/lib/format";
import { Avatar, Badge, Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { FilterBar, Pagination, pageOf } from "@/components/list-controls";
import { ActionButton } from "@/components/form";
import { setPlatformRole, setUserDisabled } from "../actions";

const u = schema.users;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const s = await requirePlatformAdmin();
  const isSuper = s.platformRole === "super";
  const { offset, limit } = pageOf(sp);
  const where = sp.q ? or(ilike(u.name, `%${sp.q}%`), ilike(u.email, `%${sp.q}%`)) : undefined;

  const [rows, [{ n }]] = await Promise.all([
    db
      .select({
        id: u.id,
        name: u.name,
        email: u.email,
        disabled: u.disabled,
        createdAt: u.createdAt,
        platformRole: schema.platformAdmins.role,
        orgs: sql<string>`coalesce((select string_agg(o.name || ' (' || m.role || ')', ', ') from organization_members m join organizations o on o.id = m.organization_id where m.user_id = ${u.id}), '')`,
      })
      .from(u)
      .leftJoin(schema.platformAdmins, eq(schema.platformAdmins.userId, u.id))
      .where(where)
      .orderBy(desc(u.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ n: count() }).from(u).where(where),
  ]);

  return (
    <>
      <PageHeader title="Users" description={`${n} accounts across all workspaces`} />
      <Card>
        <FilterBar q={sp.q} placeholder="Search name or email" />
        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th className="hidden lg:table-cell">Memberships</Th>
              <Th>Joined</Th>
              <Th>Status</Th>
              {isSuper && <Th className="text-right">Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={r.name} size="sm" />
                    <div>
                      <p className="font-medium">{r.name} {r.platformRole && <Badge tone="accent">{r.platformRole}</Badge>}</p>
                      <p className="text-xs text-muted">{r.email}</p>
                    </div>
                  </div>
                </Td>
                <Td className="hidden max-w-80 truncate text-muted lg:table-cell">{r.orgs || "—"}</Td>
                <Td className="text-muted">{date(r.createdAt)}</Td>
                <Td><Badge tone={r.disabled ? "danger" : "success"}>{r.disabled ? "disabled" : "active"}</Badge></Td>
                {isSuper && (
                  <Td className="text-right">
                    {r.id !== s.user.id && (
                      <div className="flex justify-end gap-2">
                        <ActionButton action={setUserDisabled} fields={{ id: r.id, disabled: String(!r.disabled) }} confirm={r.disabled ? undefined : `Disable ${r.email}? They'll be signed out.`}>
                          {r.disabled ? "Enable" : "Disable"}
                        </ActionButton>
                        <ActionButton action={setPlatformRole} fields={{ id: r.id, role: r.platformRole ? "none" : "support" }} variant="ghost">
                          {r.platformRole ? "Revoke admin" : "Make support"}
                        </ActionButton>
                      </div>
                    )}
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination base="/admin/users" sp={sp} total={n} />
      </Card>
    </>
  );
}
