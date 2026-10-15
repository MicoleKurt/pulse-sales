import { requirePlatformAdmin } from "@/lib/auth";
import { AdminShell } from "./shell";

export const metadata = { title: "Platform admin · Pulse Sales" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requirePlatformAdmin();
  return (
    <AdminShell user={{ name: s.user.name, email: s.user.email }} role={s.platformRole!}>
      {children}
    </AdminShell>
  );
}
