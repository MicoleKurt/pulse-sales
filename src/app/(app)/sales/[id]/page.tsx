import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { getTenant } from "@/lib/auth";
import { date, dateTime, money } from "@/lib/format";
import { Card, CardHeader, LinkButton, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";
import { ActionButton } from "@/components/form";
import { deleteSale } from "../actions";
import { loadSale } from "./load";
import { InvoiceButton } from "./invoice-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { sale } = await loadSale(await getTenant(), (await params).id);
  return { title: `Sale #${sale.number} · Pulse Sales` };
}

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTenant();
  const { sale, customer, rep, items } = await loadSale(t, id);
  const cur = t.org.currency;
  const canEdit = t.can("SALES_EDIT") && (t.can("SALES_VIEW_ALL") || sale.repId === t.user.id);

  return (
    <>
      <Link href="/sales" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Sales
      </Link>
      <PageHeader
        title={`Sale #${sale.number}`}
        description={`${customer.name} · ${date(sale.saleDate)}`}
        actions={
          <>
            <InvoiceButton
              data={{
                org: t.org.name,
                currency: cur,
                number: sale.number,
                date: sale.saleDate,
                customer: { name: customer.name, email: customer.email, address: customer.address },
                rep,
                items: items.map((i) => ({ name: i.product, sku: i.sku, qty: i.item.quantity, unit: i.unit, price: i.item.unitPrice, total: i.item.lineTotal })),
                subtotal: sale.subtotal,
                tax: sale.tax,
                taxRate: t.org.taxRate,
                total: sale.total,
                notes: sale.notes,
              }}
            />
            {canEdit && (
              <LinkButton href={`/sales/${sale.id}/edit`} variant="secondary">
                <Pencil className="size-4" /> Edit
              </LinkButton>
            )}
            {t.can("SALES_DEL") && (
              <ActionButton action={deleteSale} fields={{ id: sale.id }} variant="danger" size="md" confirm={`Delete sale #${sale.number}? You can restore it from Deleted items.`}>
                Delete
              </ActionButton>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Line items" description={`${items.length} item${items.length === 1 ? "" : "s"}`} />
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th className="text-right">Qty</Th>
                <Th className="text-right">Unit price</Th>
                <Th className="text-right">Line total</Th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ item, product, sku, unit }) => (
                <tr key={item.id}>
                  <Td>
                    <p className="font-medium">{product}</p>
                    <p className="text-xs text-muted">{sku}</p>
                  </Td>
                  <Td className="tabular text-right">{item.quantity} {unit}</Td>
                  <Td className="tabular text-right">{money(item.unitPrice, cur)}</Td>
                  <Td className="tabular text-right font-medium">{money(item.lineTotal, cur)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="tabular ml-auto max-w-xs space-y-1 px-5 py-4 text-sm">
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{money(sale.subtotal, cur)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Tax</span><span>{money(sale.tax, cur)}</span></div>
            <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{money(sale.total, cur)}</span></div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Summary" />
          <dl className="space-y-3 p-5 text-sm">
            <Row label="Status"><StatusBadge status={sale.status} /></Row>
            <Row label="Customer"><Link href={`/customers/${customer.id}`} className="text-primary hover:underline">{customer.name}</Link></Row>
            <Row label="Sales rep">{rep}</Row>
            <Row label="Sale date">{date(sale.saleDate)}</Row>
            <Row label="Created">{dateTime(sale.createdAt)}</Row>
            <Row label="Last updated">{dateTime(sale.updatedAt)}</Row>
            {sale.notes && (
              <div className="border-t border-border pt-3">
                <dt className="text-muted">Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap">{sale.notes}</dd>
              </div>
            )}
          </dl>
        </Card>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
