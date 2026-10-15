import "server-only";

export type Sheet = { name: string; columns: string[]; rows: (string | number | null)[][] };

export function toCsv(sheet: Sheet) {
  const esc = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    // Quote when needed; prefix formula-like cells to avoid CSV injection in spreadsheets.
    const safe = /^[=+\-@]/.test(s) && typeof v === "string" ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [sheet.columns, ...sheet.rows].map((r) => r.map(esc).join(",")).join("\r\n");
}

export async function toXlsx(sheets: Sheet[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Pulse Sales";
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name.slice(0, 31));
    ws.addRow(s.columns).font = { bold: true };
    s.rows.forEach((r) => ws.addRow(r));
    ws.columns.forEach((c) => (c.width = 18));
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function download(body: string | Buffer, filename: string) {
  const type = filename.endsWith(".xlsx")
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "text/csv; charset=utf-8";
  return new Response(typeof body === "string" ? "﻿" + body : new Uint8Array(body), {
    headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="${filename}"` },
  });
}
