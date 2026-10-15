import { getTenant } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/rights";
import { Alert, Card, CardHeader } from "@/components/ui";
import { DeleteOrgForm, OrgForm } from "./forms";

export const metadata = { title: "Settings · Pulse Sales" };

export default async function SettingsPage() {
  const t = await getTenant();
  const canEdit = t.can("BILLING_ADMIN") && !t.impersonating;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title="Workspace" description={canEdit ? undefined : "Only owners and billing admins can edit these."} />
        <div className="p-5">
          <OrgForm org={t.org} disabled={!canEdit} />
        </div>
      </Card>
      <Card>
        <CardHeader title="About" />
        <dl className="space-y-3 p-5 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Your role</dt><dd>{ROLE_LABEL[t.role]}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Plan</dt><dd className="capitalize">{t.plan}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Workspace ID</dt><dd className="font-mono text-xs">{t.org.slug}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Created</dt><dd>{dateTime(t.org.createdAt)}</dd></div>
        </dl>
      </Card>
      {t.role === "owner" && !t.impersonating && (
        <Card className="border-danger/40 lg:col-span-2">
          <CardHeader title="Danger zone" />
          <div className="space-y-3 p-5">
            <Alert>Deleting the workspace removes all sales, customers, products and members. This can&apos;t be undone.</Alert>
            <DeleteOrgForm name={t.org.name} />
          </div>
        </Card>
      )}
    </div>
  );
}
