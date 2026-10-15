import { notFound } from "next/navigation";
import { allNavItems } from "@/lib/nav";

// Placeholder for every nav section until its phase is built.
export default async function SectionPage({ params }: { params: Promise<{ section: string[] }> }) {
  const { section } = await params;
  const item = allNavItems.find((i) => i.href === "/" + section[0]);
  if (!item) notFound();
  const Icon = item.icon;

  return (
    <div className="grid min-h-[60vh] place-items-center rounded-[var(--radius-card)] border border-dashed border-border bg-surface p-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">{item.label}</h2>
        <p className="mt-1 text-sm text-muted">{item.description}</p>
        <p className="mt-4 text-xs text-muted">Nothing here yet. This section is wired up in a later phase.</p>
      </div>
    </div>
  );
}
