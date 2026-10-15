import Link from "next/link";
import { and, asc, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { Download, Plus, ReceiptText } from "lucide-react";
import { db, schema } from "@/db";
import { requirePage } from "@/lib/auth";
import { salesScope } from "@/lib/queries";
import { date, money } from "@/lib/format";
import { Card, EmptyState, LinkButton, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";
import { FilterBar, Pagination, SortLink, filterSelect, pageOf } from "@/components/list-controls";

export const metadata = { title: "Sales · Pulse Sales" };

const { sales, customers, users } = schema;
const SORTS = { number: sales.number, date: sales.saleDate, total: sales.total, customer: customers.name } as const;

export default async function SalesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const t = await requirePage("SALES_VIEW");
  const { offset, limit } = pageOf(sp);

  const where: SQL[] = salesScope(t);
  if (sp.q) {
    const q = `%${sp.q}%`;
    where.push(or(ilike(customers.name, q), sql`${sales.number}::text ilike ${q}`, ilike(users.name, q))!);
  }
  if (sp.status) where.push(eq(sales.status, sp.status as "completed"));
  if (sp.rep && t.can("SALES_VIEW_ALL")) where.push(eq(sales.repId, sp.rep));
  if (sp.from) where.push(gte(sales.saleDate, sp.from));
  if (sp.to) where.push(lte(sales.saleDate, sp.to));

  const sortCol = SORTS[(sp.sort as keyof typeof SORTS) ?? "date"] ?? sales.saleDate;
  const order = sp.dir === "asc" ? asc(sortCol) : desc(sortCol);

  const base = db
    .select({ id: sales.id, number: sales.number, saleDate: sales.saleDate, status: sales.status, total: sales.total, customer: customers.name, rep: users.name })
    .from(sales)
    .innerJoin(customers, eq(customers.id, sales.customerId))
    .innerJoin(users, eq(users.id, sales.repId))
    .where(and(...where));

  const [rows, [{ n }], reps] = await Promise.all([
    base.orderBy(order, desc(sales.number)).limit(limit).offset(offset),
    db
      .select({ n: count() })
      .from(sales)
      .innerJoin(customers, eq(customers.id, sales.customerId))
      .innerJoin(users, eq(users.id, sales.repId))
      .where(and(...where)),
    t.can("SALES_VIEW_ALL")
      ? db
          .select({ id: users.id, name: users.name })
          .from(schema.members)
          .innerJoin(users, eq(users.id, schema.members.userId))
          .where(eq(schema.members.organizationId, t.org.id))
          .orderBy(users.name)
      : Promise.resolve([]),
  ]);

  const exportQs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title="Sales"
        description="All sales transactions. Click a number to see its line items."
        actions={
          <>
            {t.can("EXPORT") && (
              <a href={`/api/export/sales?${exportQs}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-2">
                <Download className="size-4" /> Export CSV
              </a>
            )}
            {t.can("SALES_ADD") && (
              <LinkButton href="/sales/new">
                <Plus className="size-4" /> New sale
              </LinkButton>
            )}
          </>
        }
      />
      <Card>
        <FilterBar q={sp.q} placeholder="Search by #, customer or rep">
          <select name="status" defaultValue={sp.status ?? ""} className={filterSelect} aria-label="Status">
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {reps.length > 0 && (
            <select name="rep" defaultValue={sp.rep ?? ""} className={filterSelect} aria-label="Rep">
              <option value="">All reps</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}
          <input type="date" name="from" defaultValue={sp.from} aria-label="From date" className={filterSelect} />
          <input type="date" name="to" defaultValue={sp.to} aria-label="To date" className={filterSelect} />
        </FilterBar>
        {rows.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={sp.q || sp.status || sp.from ? "No sales match these filters" : "No sales yet"}
            description={sp.q || sp.status || sp.from ? "Try clearing some filters." : "Record your first sale to start tracking revenue."}
            action={t.can("SALES_ADD") ? <LinkButton href="/sales/new">New sale</LinkButton> : undefined}
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th><SortLink base="/sales" sp={sp} col="number">#</SortLink></Th>
                  <Th><SortLink base="/sales" sp={sp} col="customer">Customer</SortLink></Th>
                  <Th>Rep</Th>
                  <Th><SortLink base="/sales" sp={sp} col="date">Date</SortLink></Th>
                  <Th>Status</Th>
                  <Th className="text-right"><SortLink base="/sales" sp={sp} col="total">Total</SortLink></Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-2/50">
                    <Td><Link href={`/sales/${s.id}`} className="font-medium text-primary hover:underline">#{s.number}</Link></Td>
                    <Td className="max-w-56 truncate">{s.customer}</Td>
                    <Td className="text-muted">{s.rep}</Td>
                    <Td className="text-muted">{date(s.saleDate)}</Td>
                    <Td><StatusBadge status={s.status} /></Td>
                    <Td className="tabular text-right font-medium">{money(s.total, t.org.currency)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination base="/sales" sp={sp} total={n} />
          </>
        )}
      </Card>
    </>
  );
}
