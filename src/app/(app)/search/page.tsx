import Link from "next/link";
import { and, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { Box, Contact, ReceiptText, Search } from "lucide-react";
import { db, schema } from "@/db";
import { getTenant } from "@/lib/auth";
import { salesScope } from "@/lib/queries";
import { date, money } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { FilterBar } from "@/components/list-controls";

export const metadata = { title: "Search · Pulse Sales" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const t = await getTenant();
  const term = q?.trim();
  const like = `%${term}%`;

  const [sales, customers, products] = term
    ? await Promise.all([
        t.can("SALES_VIEW")
          ? db
              .select({ id: schema.sales.id, number: schema.sales.number, total: schema.sales.total, saleDate: schema.sales.saleDate, customer: schema.customers.name })
              .from(schema.sales)
              .innerJoin(schema.customers, eq(schema.customers.id, schema.sales.customerId))
              .where(and(...salesScope(t), or(sql`${schema.sales.number}::text = ${term.replace("#", "")}`, ilike(schema.customers.name, like))))
              .limit(8)
          : [],
        t.can("LOOKUP_VIEW")
          ? db
              .select({ id: schema.customers.id, name: schema.customers.name, email: schema.customers.email })
              .from(schema.customers)
              .where(and(eq(schema.customers.organizationId, t.org.id), isNull(schema.customers.deletedAt), or(ilike(schema.customers.name, like), ilike(schema.customers.email, like))))
              .limit(8)
          : [],
        t.can("LOOKUP_VIEW")
          ? db
              .select({ id: schema.products.id, name: schema.products.name, sku: schema.products.sku })
              .from(schema.products)
              .where(and(eq(schema.products.organizationId, t.org.id), isNull(schema.products.deletedAt), or(ilike(schema.products.name, like), ilike(schema.products.sku, like))))
              .limit(8)
          : [],
      ])
    : [[], [], []];

  const none = term && !sales.length && !customers.length && !products.length;

  return (
    <>
      <PageHeader title="Search" description="Sales, customers and products." />
      <Card className="mb-4">
        <FilterBar q={term} placeholder="Type a sale #, customer, product or SKU" />
      </Card>
      {!term && <Card><EmptyState icon={Search} title="Start typing" description="Tip: press Ctrl K anywhere to jump to search." /></Card>}
      {none && <Card><EmptyState icon={Search} title={`No results for “${term}”`} description="Try a different term." /></Card>}
      <div className="grid gap-4 lg:grid-cols-3">
        {sales.length > 0 && (
          <Group title="Sales" icon={ReceiptText}>
            {sales.map((s) => (
              <Item key={s.id} href={`/sales/${s.id}`} title={`#${s.number} · ${s.customer}`} sub={`${date(s.saleDate)} · ${money(s.total, t.org.currency)}`} />
            ))}
          </Group>
        )}
        {customers.length > 0 && (
          <Group title="Customers" icon={Contact}>
            {customers.map((c) => <Item key={c.id} href={`/customers/${c.id}`} title={c.name} sub={c.email ?? ""} />)}
          </Group>
        )}
        {products.length > 0 && (
          <Group title="Products" icon={Box}>
            {products.map((p) => <Item key={p.id} href={`/products/${p.id}`} title={p.name} sub={p.sku} />)}
          </Group>
        )}
      </div>
    </>
  );
}

function Group({ title, icon: Icon, children }: { title: string; icon: typeof Box; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} action={<Icon className="size-4 text-muted" />} />
      <ul className="divide-y divide-border">{children}</ul>
    </Card>
  );
}

function Item({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <li>
      <Link href={href} className="block px-5 py-3 hover:bg-surface-2/50">
        <p className="truncate text-sm font-medium">{title}</p>
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </Link>
    </li>
  );
}
