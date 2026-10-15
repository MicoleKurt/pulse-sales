"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui";

export function ReportPdfButton({
  org,
  title,
  currency,
  countLabel,
  rows,
}: {
  org: string;
  title: string;
  currency: string;
  countLabel: string;
  rows: { label: string; count: number; revenue: number; extra?: string }[];
}) {
  const run = async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${org} — Sales report`, 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(title, 14, 25);
    doc.text(`Generated ${new Date().toLocaleString()}`, 14, 30);
    const total = rows.reduce((s, r) => s + r.revenue, 0);
    autoTable(doc, {
      startY: 38,
      head: [["Name", countLabel, "Revenue", "Share"]],
      body: rows.map((r) => [r.extra ? `${r.label} (${r.extra})` : r.label, String(r.count), fmt(r.revenue), total ? `${((r.revenue / total) * 100).toFixed(1)}%` : "0%"]),
      foot: [["Total", String(rows.reduce((s, r) => s + r.count, 0)), fmt(total), "100%"]],
      headStyles: { fillColor: [79, 70, 229] },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      styles: { fontSize: 9 },
    });
    doc.save(`report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };
  return (
    <Button type="button" variant="secondary" onClick={run} disabled={!rows.length}>
      <FileDown className="size-4" /> PDF
    </Button>
  );
}
