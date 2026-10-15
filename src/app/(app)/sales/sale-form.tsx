"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/form";
import { Button, Card, CardHeader, Field, Input, LinkButton, Select, Textarea, inputClass } from "@/components/ui";
import { saveSale } from "./actions";

type Option = { id: string; name: string };
type Product = Option & { sku: string; unit: string; price: number | null };
type Line = { key: string; id?: string; productId: string; quantity: string; unitPrice: string };

export type SaleFormProps = {
  currency: string;
  taxRate: number;
  customers: Option[];
  reps: Option[];
  products: Product[];
  canPickRep: boolean;
  defaults: { id?: string; customerId?: string; repId: string; saleDate: string; status: string; notes?: string | null; items: Omit<Line, "key">[] };
};

let k = 0;
const key = () => `l${++k}`;

export function SaleForm({ currency, taxRate, customers, reps, products, canPickRep, defaults }: SaleFormProps) {
  const [lines, setLines] = useState<Line[]>(() =>
    defaults.items.length ? defaults.items.map((i) => ({ ...i, key: key() })) : [{ key: key(), productId: "", quantity: "1", unitPrice: "" }],
  );
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const subtotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  const tax = (subtotal * taxRate) / 100;

  const payload = JSON.stringify(
    lines
      .filter((l) => l.productId)
      .map((l) => ({ id: l.id, productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice === "" ? undefined : l.unitPrice })),
  );

  return (
    <ActionForm action={saveSale} className="space-y-4">
      {(s) => (
        <>
          {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
          <input type="hidden" name="items" value={payload} />
          <Card>
            <CardHeader title="Details" />
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Customer" name="customerId" error={s?.fieldErrors?.customerId}>
                <Select id="customerId" name="customerId" defaultValue={defaults.customerId ?? ""} required>
                  <option value="" disabled>Select customer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Sales rep" name="repId" error={s?.fieldErrors?.repId}>
                <Select id="repId" name="repId" defaultValue={defaults.repId} disabled={!canPickRep}>
                  {reps.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </Select>
                {!canPickRep && <input type="hidden" name="repId" value={defaults.repId} />}
              </Field>
              <Field label="Date" name="saleDate" error={s?.fieldErrors?.saleDate}>
                <Input id="saleDate" name="saleDate" type="date" defaultValue={defaults.saleDate} required />
              </Field>
              <Field label="Status" name="status">
                <Select id="status" name="status" defaultValue={defaults.status}>
                  <option value="completed">Completed</option>
                  <option value="draft">Draft</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Line items"
              description="Unit price fills in from price history; you can override it."
              action={
                <Button type="button" variant="secondary" size="sm" onClick={() => setLines((ls) => [...ls, { key: key(), productId: "", quantity: "1", unitPrice: "" }])}>
                  <Plus className="size-4" /> Add item
                </Button>
              }
            />
            <div className="divide-y divide-border">
              {lines.map((l) => {
                const p = byId.get(l.productId);
                const total = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
                return (
                  <div key={l.key} className="grid grid-cols-12 items-end gap-3 px-5 py-3">
                    <label className="col-span-12 space-y-1 sm:col-span-5">
                      <span className="text-xs text-muted">Product</span>
                      <select
                        className={inputClass}
                        value={l.productId}
                        aria-label="Product"
                        onChange={(e) => {
                          const np = byId.get(e.target.value);
                          update(l.key, { productId: e.target.value, unitPrice: np?.price != null ? String(np.price) : "" });
                        }}
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="col-span-4 space-y-1 sm:col-span-2">
                      <span className="text-xs text-muted">Qty {p ? `(${p.unit})` : ""}</span>
                      <input className={inputClass} type="number" min="0.01" step="0.01" value={l.quantity} aria-label="Quantity" onChange={(e) => update(l.key, { quantity: e.target.value })} />
                    </label>
                    <label className="col-span-4 space-y-1 sm:col-span-2">
                      <span className="text-xs text-muted">Unit price</span>
                      <input className={inputClass} type="number" min="0" step="0.01" value={l.unitPrice} placeholder="auto" aria-label="Unit price" onChange={(e) => update(l.key, { unitPrice: e.target.value })} />
                    </label>
                    <div className="tabular col-span-3 pb-2.5 text-right text-sm font-medium sm:col-span-2">{fmt(total)}</div>
                    <div className="col-span-1 flex justify-end pb-1">
                      <button
                        type="button"
                        aria-label="Remove line"
                        disabled={lines.length === 1}
                        onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {s?.fieldErrors?.items && <p className="px-5 pb-3 text-xs text-danger">{s.fieldErrors.items[0]}</p>}
            <div className="tabular ml-auto max-w-xs space-y-1 border-t border-border px-5 py-4 text-sm">
              <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Tax ({taxRate}%)</span><span>{fmt(tax)}</span></div>
              <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{fmt(subtotal + tax)}</span></div>
            </div>
          </Card>

          <Card className="p-5">
            <Field label="Notes" name="notes">
              <Textarea id="notes" name="notes" defaultValue={defaults.notes ?? ""} placeholder="Optional internal notes" />
            </Field>
          </Card>

          <div className="flex justify-end gap-2">
            <LinkButton href={defaults.id ? `/sales/${defaults.id}` : "/sales"} variant="secondary">Cancel</LinkButton>
            <SubmitButton>{defaults.id ? "Save changes" : "Create sale"}</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
