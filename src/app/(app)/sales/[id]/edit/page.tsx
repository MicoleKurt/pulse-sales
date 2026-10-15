import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SaleForm } from "../../sale-form";
import { saleFormOptions } from "../../form-data";
import { loadSale } from "../load";

export const metadata = { title: "Edit sale · Pulse Sales" };

export default async function EditSalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await requirePage("SALES_EDIT");
  const { sale, items } = await loadSale(t, id);
  if (!t.can("SALES_VIEW_ALL") && sale.repId !== t.user.id) notFound();
  const opts = await saleFormOptions(t);

  return (
    <>
      <PageHeader title={`Edit sale #${sale.number}`} />
      <SaleForm
        {...opts}
        defaults={{
          id: sale.id,
          customerId: sale.customerId,
          repId: sale.repId,
          saleDate: sale.saleDate,
          status: sale.status,
          notes: sale.notes,
          items: items.map(({ item }) => ({ id: item.id, productId: item.productId, quantity: String(item.quantity), unitPrice: String(item.unitPrice) })),
        }}
      />
    </>
  );
}
