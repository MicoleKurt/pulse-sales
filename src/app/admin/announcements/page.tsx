import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { dateTime } from "@/lib/format";
import { Badge, Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/ui";
import { ActionButton } from "@/components/form";
import { endAnnouncement } from "../actions";
import { AnnouncementForm } from "./form";

export default async function AdminAnnouncementsPage() {
  const [rows, orgs] = await Promise.all([
    db
      .select({ a: schema.announcements, org: schema.organizations.name })
      .from(schema.announcements)
      .leftJoin(schema.organizations, eq(schema.organizations.id, schema.announcements.organizationId))
      .orderBy(desc(schema.announcements.createdAt))
      .limit(50),
    db.select({ id: schema.organizations.id, name: schema.organizations.name }).from(schema.organizations).orderBy(asc(schema.organizations.name)),
  ]);
  const now = new Date();

  return (
    <>
      <PageHeader title="Announcements" description="Banners shown at the top of the app for all workspaces or one." />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="New announcement" />
          <div className="p-5"><AnnouncementForm orgs={orgs} /></div>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="History" />
          <Table>
            <thead>
              <tr><Th>Message</Th><Th>Audience</Th><Th>Ends</Th><Th /></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><Td colSpan={4} className="py-8 text-center text-muted">No announcements yet.</Td></tr>}
              {rows.map(({ a, org }) => {
                const live = !a.endsAt || a.endsAt > now;
                return (
                  <tr key={a.id}>
                    <Td className="max-w-md whitespace-normal">{a.message}</Td>
                    <Td>{org ?? <Badge tone="primary">All</Badge>}</Td>
                    <Td className="text-muted">{live ? dateTime(a.endsAt) : <Badge>ended</Badge>}</Td>
                    <Td className="text-right">{live && <ActionButton action={endAnnouncement} fields={{ id: a.id }} variant="ghost">End now</ActionButton>}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
