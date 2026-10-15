import { getTenant } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/rights";
import { Avatar, Card, CardHeader, PageHeader } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { PasswordForm, ProfileForm } from "../settings/forms";

export const metadata = { title: "Profile · Pulse Sales" };

export default async function ProfilePage() {
  const t = await getTenant();
  return (
    <>
      <PageHeader title="Profile" description="Your personal account settings." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 text-center">
          <div className="flex justify-center"><Avatar name={t.user.name} /></div>
          <p className="mt-3 font-semibold">{t.user.name}</p>
          <p className="text-sm text-muted">{t.user.email}</p>
          <p className="mt-2 text-xs text-muted">{ROLE_LABEL[t.role]} at {t.org.name}</p>
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-muted">
            Theme <ThemeToggle />
          </div>
        </Card>
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Personal details" />
            <div className="p-5"><ProfileForm user={t.user} /></div>
          </Card>
          <Card>
            <CardHeader title="Password" />
            <div className="p-5"><PasswordForm /></div>
          </Card>
        </div>
      </div>
    </>
  );
}
