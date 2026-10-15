import { ScrollText } from "lucide-react";
import { dateTime } from "@/lib/format";
import { Badge, EmptyState } from "./ui";

export type AuditRow = {
  id: string;
  entity: string;
  entityId: string | null;
  action: string;
  before: unknown;
  after: unknown;
  createdAt: Date;
  actor: string | null;
  org?: string | null;
};

const tone = (a: string) =>
  a === "create" || a === "restore" || a === "join" ? "success" : a === "delete" || a === "purge" || a === "remove" || a === "suspend" ? "danger" : a === "update" ? "primary" : "neutral";

const SKIP = new Set(["updatedAt", "createdAt", "organizationId", "createdBy", "passwordHash"]);

/** Field-level diff between before/after snapshots. */
function diff(before: unknown, after: unknown) {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  if (typeof b !== "object" || typeof a !== "object" || Array.isArray(a)) return null;
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => !SKIP.has(k));
  return keys
    .map((k) => ({ k, from: b[k], to: a[k] }))
    .filter((c) => JSON.stringify(c.from) !== JSON.stringify(c.to));
}

const show = (v: unknown) => (v == null ? "—" : typeof v === "object" ? JSON.stringify(v).slice(0, 120) : String(v));

export function AuditTable({ rows, showOrg }: { rows: AuditRow[]; showOrg?: boolean }) {
  if (!rows.length) return <EmptyState icon={ScrollText} title="No activity" description="Changes will be recorded here." />;
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => {
        const changes = diff(r.before, r.after);
        return (
          <li key={r.id} className="px-5 py-3">
            <details className="group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-sm">
                <Badge tone={tone(r.action)}>{r.action}</Badge>
                <span className="font-medium capitalize">{r.entity}</span>
                {r.entityId && <span className="font-mono text-[11px] text-muted">{r.entityId.slice(0, 8)}</span>}
                <span className="text-muted">by {r.actor ?? "system"}</span>
                {showOrg && r.org && <span className="text-muted">· {r.org}</span>}
                <span className="ml-auto text-xs text-muted">{dateTime(r.createdAt)}</span>
              </summary>
              <div className="mt-3 rounded-lg bg-surface-2 p-3 text-xs">
                {changes && changes.length ? (
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-muted">
                        <th className="pb-1 font-medium">Field</th>
                        <th className="pb-1 font-medium">Before</th>
                        <th className="pb-1 font-medium">After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changes.map((c) => (
                        <tr key={c.k} className="align-top">
                          <td className="py-0.5 pr-3 font-mono">{c.k}</td>
                          <td className="py-0.5 pr-3 text-danger">{show(c.from)}</td>
                          <td className="py-0.5 text-success">{show(c.to)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <pre className="overflow-x-auto whitespace-pre-wrap font-mono">{JSON.stringify(r.after ?? r.before, null, 2)?.slice(0, 2000) ?? "No details"}</pre>
                )}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
