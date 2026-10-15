import { PageHeader } from "@/components/ui";
import { SettingsTabs } from "./tabs";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Settings" description="Workspace profile, billing and plan." />
      <SettingsTabs />
      {children}
    </>
  );
}
