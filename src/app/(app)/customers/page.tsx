import Link from "next/link";
import { and, asc, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { Contact, Download, Plus } from "lucide-react";
import { db, schema } from "@/db";
import { requirePage } from "@/lib/auth";
import { date, money } from "@/lib/format";
import { Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { FilterBar, Pagination, SortLink, pageOf } from "@/components/list-controls";
import { CsvImport } from "@/components/csv-import";
import { importCsv } from "../lookups-actions";
import { CustomerForm } from "./customer-form";

export const metadata = { title: "Customers · Pulse Sales" };

const { customers: c, sales: s } = schema;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const t = await requirePage("LOOKUP_VIEW");
  const { offset, limit } = pageOf(sp);

  const where = and(
    eq(c.organizationId, t.org.id),
    isNull(c.deletedAt),
    sp.q ? or(ilike(c.name, `%${sp.q}%`), ilike(c.email, `%${sp.q}%`), ilike(c.phone, `%${sp.q}%`)) : undefined,
  );
  const revenue = sql<number>`coalesce(sum(${s.total}) filter (where ${s.status} = 'completed'), 0)`.mapWith(Number);
  const sorts = { name: c.name, revenue, last: sql`max(${s.saleDate})` };
  const col = sorts[sp.sort as keyof typeof sorts] ?? c.name;

  const [rows, [{ n }]] = await Promise.all([
    db
      .select({ id: c.id, name: c.name, email: c.email, phone: c.phone, orders: sql<number>`count(${s.id})`.mapWith(Number), revenue, last: sql<string | null>`max(${s.saleDate})` })
      .from(c)
      .leftJoin(s, and(eq(s.customerId, c.id), isNull(s.deletedAt)))
      .where(where)
      .groupBy(c.id)
      .orderBy(sp.dir === "desc" ? desc(col) : asc(col))
      .limit(limit)
      .offset(offset),
    db.select({ n: count() }).from(c).where(where),
  ]);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone you sell to, with their order history."
        actions={
          <>
            {t.can("EXPORT") && (
              <a href={`/api/export/customers?format=csv`} download className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-2">
                <Download className="size-4" /> Export
              </a>
            )}
            {t.can("LOOKUP_EDIT") && <CsvImport label="Import CSV" columns={["name", "email", "phone", "address"]} required={["name"]} action={importCsv.bind(null, "customers")} />}
          </>
        }
      />

      {t.can("LOOKUP_EDIT") && (
        <details className="group mb-4 rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow)]">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-medium">
            <Plus className="size-4 text-primary transition group-open:rotate-45" /> Add customer
          </summary>
          <div className="border-t border-border p-5">
            <CustomerForm />
          </div>
        </details>
      )}

      <Card>
        <FilterBar q={sp.q} placeholder="Search name, email or phone" />
        {rows.length === 0 ? (
          <EmptyState icon={Contact} title={sp.q ? "No customers match" : "No customers yet"} description={sp.q ? "Try a different search." : "Add your first customer or import a CSV."} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th><SortLink base="/customers" sp={sp} col="name">Name</SortLink></Th>
                  <Th className="hidden md:table-cell">Contact</Th>
                  <Th className="text-right">Orders</Th>
                  <Th className="text-right"><SortLink base="/customers" sp={sp} col="revenue">Revenue</SortLink></Th>
                  <Th className="hidden sm:table-cell"><SortLink base="/customers" sp={sp} col="last">Last order</SortLink></Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-2/50">
                    <Td><Link href={`/customers/${r.id}`} className="font-medium text-primary hover:underline">{r.name}</Link></Td>
                    <Td className="hidden text-muted md:table-cell">{[r.email, r.phone].filter(Boolean).join(" · ") || "—"}</Td>
                    <Td className="tabular text-right">{r.orders}</Td>
                    <Td className="tabular text-right font-medium">{money(r.revenue, t.org.currency)}</Td>
                    <Td className="hidden text-muted sm:table-cell">{date(r.last)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination base="/customers" sp={sp} total={n} />
          </>
        )}
      </Card>
    </>
  );
}
