import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { dateTime } from "@/lib/format";
import { Badge, Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/ui";

export default async function AdminSystemPage() {
  const [events, emails] = await Promise.all([
    db.select().from(schema.webhookEvents).orderBy(desc(schema.webhookEvents.createdAt)).limit(50),
    db.select().from(schema.outbox).orderBy(desc(schema.outbox.createdAt)).limit(50),
  ]);
  return (
    <>
      <PageHeader title="Webhooks & emails" description="Incoming Stripe events and the outgoing email outbox." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Email outbox" description="All transactional email (invites, password resets). Open links here when running locally." />
          <ul className="divide-y divide-border">
            {emails.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">No emails sent yet.</li>}
            {emails.map((e) => (
              <li key={e.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{e.subject}</p>
                  <span className="shrink-0 text-xs text-muted">{dateTime(e.createdAt)}</span>
                </div>
                <p className="text-xs text-muted">To {e.to}</p>
                <p className="mt-1 break-all text-xs">
                  {e.body.split(/(https?:\/\/\S+)/).map((part, i) =>
                    part.startsWith("http") ? (
                      <a key={i} href={part} className="text-primary hover:underline">{part}</a>
                    ) : (
                      <span key={i}>{part}</span>
                    ),
                  )}
                </p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Webhook events" />
          <Table>
            <thead>
              <tr><Th>Event</Th><Th>Received</Th><Th>Status</Th></tr>
            </thead>
            <tbody>
              {events.length === 0 && <tr><Td colSpan={3} className="py-8 text-center text-muted">No webhook events. They appear when Stripe is configured.</Td></tr>}
              {events.map((e) => (
                <tr key={e.id}>
                  <Td><p className="font-medium">{e.type}</p><p className="font-mono text-[11px] text-muted">{e.id}</p></Td>
                  <Td className="text-muted">{dateTime(e.createdAt)}</Td>
                  <Td>{e.error ? <Badge tone="danger">error</Badge> : e.processedAt ? <Badge tone="success">processed</Badge> : <Badge>pending</Badge>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
