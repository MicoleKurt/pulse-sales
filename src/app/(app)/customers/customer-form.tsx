"use client";

import { ActionForm, SubmitButton } from "@/components/form";
import { Field, Input } from "@/components/ui";
import { saveCustomer } from "../lookups-actions";

type Customer = { id: string; name: string; email: string | null; phone: string | null; address: string | null };

export function CustomerForm({ customer }: { customer?: Customer }) {
  return (
    <ActionForm action={saveCustomer} resetOnSuccess={!customer} className="space-y-4">
      {(s) => (
        <>
          {customer && <input type="hidden" name="id" value={customer.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" name="name" error={s?.fieldErrors?.name}>
              <Input name="name" defaultValue={customer?.name} required />
            </Field>
            <Field label="Email" name="email" error={s?.fieldErrors?.email}>
              <Input name="email" type="email" defaultValue={customer?.email ?? ""} />
            </Field>
            <Field label="Phone" name="phone">
              <Input name="phone" defaultValue={customer?.phone ?? ""} />
            </Field>
            <Field label="Address" name="address">
              <Input name="address" defaultValue={customer?.address ?? ""} />
            </Field>
          </div>
          <div className="flex justify-end">
            <SubmitButton>{customer ? "Save changes" : "Add customer"}</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
