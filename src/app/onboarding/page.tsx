import { Activity } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { logout } from "../(auth)/actions";
import { OnboardingForm } from "../(auth)/forms";

export const metadata = { title: "Set up your workspace · Pulse Sales" };

export default async function OnboardingPage() {
  const s = await requireUser();
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-fg">
          <Activity className="size-5" />
        </span>
        <h1 className="mt-5 text-xl font-semibold">Welcome, {s.user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted">Create your company workspace. You&apos;ll get 14 days of Pro free.</p>
        <OnboardingForm />
        <form action={logout} className="mt-4 text-center">
          <button className="text-sm text-muted hover:text-text">Sign out</button>
        </form>
      </Card>
    </div>
  );
}
