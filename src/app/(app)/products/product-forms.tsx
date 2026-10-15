"use client";

import { ActionForm, SubmitButton } from "@/components/form";
import { Field, Input, Select } from "@/components/ui";
import { addPrice, saveProduct } from "../lookups-actions";

type Product = { id: string; sku: string; name: string; unit: string };

export function ProductForm({ product }: { product?: Product }) {
  return (
    <ActionForm action={saveProduct} resetOnSuccess={!product} className="space-y-4">
      {(s) => (
        <>
          {product && <input type="hidden" name="id" value={product.id} />}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="SKU" name="sku" error={s?.fieldErrors?.sku}>
              <Input name="sku" defaultValue={product?.sku} required />
            </Field>
            <Field label="Name" name="name" error={s?.fieldErrors?.name}>
              <Input name="name" defaultValue={product?.name} required />
            </Field>
            <Field label="Unit" name="unit">
              <Input name="unit" defaultValue={product?.unit ?? "pc"} />
            </Field>
            {!product && (
              <Field label="Starting price" name="price" error={s?.fieldErrors?.price} hint="Effective today">
                <Input name="price" type="number" min="0" step="0.01" />
              </Field>
            )}
          </div>
          <div className="flex justify-end">
            <SubmitButton>{product ? "Save changes" : "Add product"}</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function PriceForm({ products, productId, today }: { products?: { id: string; name: string }[]; productId?: string; today: string }) {
  return (
    <ActionForm action={addPrice} resetOnSuccess className="space-y-4">
      {(s) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {productId ? (
              <input type="hidden" name="productId" value={productId} />
            ) : (
              <Field label="Product" name="productId" error={s?.fieldErrors?.productId}>
                <Select name="productId" defaultValue="" required>
                  <option value="" disabled>Select…</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Unit price" name="unitPrice" error={s?.fieldErrors?.unitPrice}>
              <Input name="unitPrice" type="number" min="0" step="0.01" required />
            </Field>
            <Field label="Effective date" name="effectiveDate" error={s?.fieldErrors?.effectiveDate}>
              <Input name="effectiveDate" type="date" defaultValue={today} required />
            </Field>
          </div>
          <div className="flex justify-end">
            <SubmitButton>Add price</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
