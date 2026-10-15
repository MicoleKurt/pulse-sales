import { Contact } from "lucide-react";
import { requirePage } from "@/lib/auth";
import { isoDate } from "@/lib/format";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { SaleForm } from "../sale-form";
import { saleFormOptions } from "../form-data";

export const metadata = { title: "New sale · Pulse Sales" };

export default async function NewSalePage() {
  const t = await requirePage("SALES_ADD");
  const opts = await saleFormOptions(t);

  if (!opts.customers.length || !opts.products.length)
    return (
      <>
        <PageHeader title="New sale" />
        <Card>
          <EmptyState
            icon={Contact}
            title="Add customers and products first"
            description="A sale needs at least one customer and one priced product."
            action={
              <div className="flex gap-2">
                <LinkButton href="/customers" variant="secondary">Customers</LinkButton>
                <LinkButton href="/products">Products</LinkButton>
              </div>
            }
          />
        </Card>
      </>
    );

  return (
    <>
      <PageHeader title="New sale" description="Pick a customer, add line items and save." />
      <SaleForm {...opts} defaults={{ repId: t.user.id, saleDate: isoDate(new Date()), status: "completed", items: [] }} />
    </>
  );
}
