import { db, schema } from "@/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { PlanLimitsForm } from "./form";

export default async function AdminPlansPage() {
  const s = await requirePlatformAdmin();
  const limits = await db.select().from(schema.planLimits);
  const order = ["free", "pro", "business"];
  return (
    <>
      <PageHeader title="Plans & limits" description="Enforced on the server for every workspace. Leave a limit empty for unlimited." />
      <div className="grid gap-4 lg:grid-cols-3">
        {limits
          .sort((a, b) => order.indexOf(a.plan) - order.indexOf(b.plan))
          .map((l) => (
            <Card key={l.plan}>
              <CardHeader title={l.plan[0]!.toUpperCase() + l.plan.slice(1)} />
              <div className="p-5">
                <PlanLimitsForm limits={l} disabled={s.platformRole !== "super"} />
              </div>
            </Card>
          ))}
      </div>
    </>
  );
}
