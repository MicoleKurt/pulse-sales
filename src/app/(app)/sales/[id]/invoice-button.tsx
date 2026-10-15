"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui";

type Invoice = {
  org: string;
  currency: string;
  number: number;
  date: string;
  customer: { name: string; email: string | null; address: string | null };
  rep: string;
  items: { name: string; sku: string; qty: number; unit: string; price: number; total: number }[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  notes: string | null;
};

export function InvoiceButton({ data }: { data: Invoice }) {
  const download = async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency }).format(n);
    const doc = new jsPDF();
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(data.org, 14, 18);
    doc.setFontSize(11);
    doc.text(`INVOICE #${data.number}`, 196, 18, { align: "right" });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text("Bill to", 14, 42);
    doc.setFontSize(12);
    doc.text(data.customer.name, 14, 49);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    [data.customer.email, data.customer.address].filter(Boolean).forEach((l, i) => doc.text(String(l), 14, 55 + i * 5));
    doc.text(`Date: ${data.date}`, 196, 42, { align: "right" });
    doc.text(`Sales rep: ${data.rep}`, 196, 48, { align: "right" });

    autoTable(doc, {
      startY: 70,
      head: [["Product", "SKU", "Qty", "Unit price", "Total"]],
      body: data.items.map((i) => [i.name, i.sku, `${i.qty} ${i.unit}`, fmt(i.price), fmt(i.total)]),
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
      styles: { fontSize: 9 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let y = (doc as any).lastAutoTable.finalY + 10;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    for (const [label, value] of [["Subtotal", fmt(data.subtotal)], [`Tax (${data.taxRate}%)`, fmt(data.tax)], ["Total", fmt(data.total)]]) {
      doc.text(label, 150, y);
      doc.text(value, 196, y, { align: "right" });
      y += 6;
    }
    if (data.notes) {
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(doc.splitTextToSize(`Notes: ${data.notes}`, 180), 14, y + 8);
    }
    doc.save(`invoice-${data.number}.pdf`);
  };

  return (
    <Button type="button" variant="secondary" onClick={download}>
      <FileDown className="size-4" /> Invoice PDF
    </Button>
  );
}
