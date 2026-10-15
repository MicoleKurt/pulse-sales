import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePage } from "@/lib/auth";
import { ALL_RIGHTS, RIGHTS, ROLE_LABEL } from "@/lib/rights";
import { getLimits } from "@/lib/services";
import { dateTime } from "@/lib/format";
import { Avatar, Badge, Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/ui";
import { ActionButton } from "@/components/form";
import { revokeInvite, updateMember } from "./actions";
import { InviteForm, MemberRoleSelect, RightsMatrix } from "./client";

export const metadata = { title: "Team & rights · Pulse Sales" };

export default async function RightsPage() {
  const t = await requirePage("TEAM_ADMIN");
  const [members, invites, rights, limits] = await Promise.all([
    db
      .select({ id: schema.members.id, userId: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.members.role, status: schema.members.status, since: schema.members.createdAt })
      .from(schema.members)
      .innerJoin(schema.users, eq(schema.users.id, schema.members.userId))
      .where(eq(schema.members.organizationId, t.org.id))
      .orderBy(asc(schema.users.name)),
    db
      .select()
      .from(schema.invitations)
      .where(and(eq(schema.invitations.organizationId, t.org.id), isNull(schema.invitations.acceptedAt), gt(schema.invitations.expiresAt, new Date()))),
    db.select().from(schema.roleRights).where(eq(schema.roleRights.organizationId, t.org.id)),
    getLimits(t.plan),
  ]);
  const active = members.filter((m) => m.status === "active").length;
  const allowed = Object.fromEntries(rights.map((r) => [`${r.role}:${r.right}`, r.allowed]));

  return (
    <>
      <PageHeader title="Team & rights" description={`${active} active member${active === 1 ? "" : "s"}${limits.maxSeats ? ` of ${limits.maxSeats} seats on ${t.plan}` : ""}`} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Members" />
          <Table>
            <thead>
              <tr>
                <Th>Member</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const self = m.userId === t.user.id;
                const locked = self || (m.role === "owner" && t.role !== "owner");
                return (
                  <tr key={m.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name} size="sm" />
                        <div>
                          <p className="font-medium">{m.name} {self && <span className="text-xs text-muted">(you)</span>}</p>
                          <p className="text-xs text-muted">{m.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>{locked ? <Badge tone="primary">{ROLE_LABEL[m.role]}</Badge> : <MemberRoleSelect id={m.id} role={m.role} canOwner={t.role === "owner"} />}</Td>
                    <Td><Badge tone={m.status === "active" ? "success" : "neutral"}>{m.status}</Badge></Td>
                    <Td className="text-right">
                      {!locked && (
                        <div className="flex justify-end gap-2">
                          <ActionButton action={updateMember} fields={{ id: m.id, status: m.status === "active" ? "inactive" : "active" }}>
                            {m.status === "active" ? "Deactivate" : "Activate"}
                          </ActionButton>
                          <ActionButton action={updateMember} fields={{ id: m.id, remove: "1" }} variant="ghost" confirm={`Remove ${m.name} from ${t.org.name}?`}>
                            Remove
                          </ActionButton>
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Invite someone" description="They'll get a link valid for 7 days." />
            <div className="p-5">
              <InviteForm canOwner={t.role === "owner"} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Pending invitations" />
            <ul className="divide-y divide-border">
              {invites.length === 0 && <li className="px-5 py-6 text-center text-sm text-muted">None pending.</li>}
              {invites.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{i.email}</p>
                    <p className="text-xs text-muted">{ROLE_LABEL[i.role]} · expires {dateTime(i.expiresAt)}</p>
                  </div>
                  <ActionButton action={revokeInvite} fields={{ id: i.id }} variant="ghost">Revoke</ActionButton>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader title="Rights matrix" description="What each role can do. Owners always have every right." />
        <RightsMatrix rights={ALL_RIGHTS.map((r) => ({ code: r, label: RIGHTS[r] }))} allowed={allowed} />
      </Card>
    </>
  );
}
