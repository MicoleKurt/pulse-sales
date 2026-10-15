"use client";

import { useState, useTransition } from "react";
import { Upload, X } from "lucide-react";
import type { ActionState } from "@/lib/action";
import { Alert, Button, Card } from "./ui";

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

export function CsvImport({
  columns,
  required,
  action,
  label,
}: {
  columns: string[];
  required: string[];
  action: (rows: Record<string, string>[]) => Promise<ActionState>;
  label: string;
}) {
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ActionState>(null);
  const [pending, start] = useTransition();

  const onFile = async (file: File) => {
    setError(null);
    setResult(null);
    const [header, ...body] = parseCsv(await file.text());
    if (!header) return setError("The file is empty.");
    const keys = header.map((h) => h.trim().toLowerCase());
    const missing = required.filter((c) => !keys.includes(c));
    if (missing.length) return setError(`Missing column(s): ${missing.join(", ")}. Expected: ${columns.join(", ")}`);
    setRows(body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()]))));
  };

  return (
    <>
      <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-2">
        <Upload className="size-4" /> {label}
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </label>
      {(rows || error || result) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold">Import preview</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setRows(null);
                  setError(null);
                  setResult(null);
                }}
              >
                <X className="size-4 text-muted" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              {error && <Alert>{error}</Alert>}
              {result?.error && <Alert>{result.error}</Alert>}
              {result?.ok && <Alert tone="success">{result.message}</Alert>}
              {rows && !result?.ok && (
                <>
                  <p className="text-sm text-muted">
                    {rows.length} row{rows.length === 1 ? "" : "s"} found. First {Math.min(rows.length, 8)} shown.
                  </p>
                  <div className="max-h-72 overflow-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-2">
                        <tr>{columns.map((c) => <th key={c} className="px-3 py-2 font-medium capitalize">{c}</th>)}</tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 8).map((r, i) => (
                          <tr key={i} className="border-t border-border">
                            {columns.map((c) => <td key={c} className="max-w-40 truncate px-3 py-2">{r[c]}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" disabled={pending || !rows.length} onClick={() => start(async () => setResult(await action(rows)))}>
                      {pending ? "Importing…" : `Import ${rows.length} rows`}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
