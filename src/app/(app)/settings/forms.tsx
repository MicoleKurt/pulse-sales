"use client";

import { ActionForm, SubmitButton } from "@/components/form";
import { Field, Input, Select } from "@/components/ui";
import { changePassword, changePlan, deleteOrg, updateOrg, updateProfile } from "./actions";

const CURRENCIES = ["USD", "EUR", "GBP", "PHP", "AUD", "CAD", "SGD", "JPY"];

export function OrgForm({ org, disabled }: { org: { name: string; currency: string; taxRate: number }; disabled: boolean }) {
  return (
    <ActionForm action={updateOrg} className="space-y-4">
      {(s) => (
        <fieldset disabled={disabled} className="space-y-4">
          <Field label="Workspace name" name="name" error={s?.fieldErrors?.name}>
            <Input name="name" defaultValue={org.name} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency" name="currency">
              <Select name="currency" defaultValue={org.currency}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Tax rate %" name="taxRate" error={s?.fieldErrors?.taxRate} hint="Applied to new and edited sales.">
              <Input name="taxRate" type="number" step="0.01" min="0" max="50" defaultValue={org.taxRate} />
            </Field>
          </div>
          {!disabled && (
            <div className="flex justify-end">
              <SubmitButton>Save</SubmitButton>
            </div>
          )}
        </fieldset>
      )}
    </ActionForm>
  );
}

export function DeleteOrgForm({ name }: { name: string }) {
  return (
    <ActionForm action={deleteOrg} className="space-y-3">
      {(s) => (
        <>
          <Field label={`Type “${name}” to confirm`} name="confirm" error={s?.fieldErrors?.confirm}>
            <Input name="confirm" autoComplete="off" />
          </Field>
          <SubmitButton variant="danger">Delete workspace forever</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function PlanButton({ plan, label, variant }: { plan: string; label: string; variant: "primary" | "secondary" }) {
  return (
    <ActionForm action={changePlan} className="space-y-2">
      <input type="hidden" name="plan" value={plan} />
      <SubmitButton variant={variant} className="w-full">{label}</SubmitButton>
    </ActionForm>
  );
}

export function ProfileForm({ user }: { user: { name: string; email: string } }) {
  return (
    <ActionForm action={updateProfile} className="space-y-4">
      {(s) => (
        <>
          <Field label="Full name" name="name" error={s?.fieldErrors?.name}>
            <Input name="name" defaultValue={user.name} required />
          </Field>
          <Field label="Email" name="email" error={s?.fieldErrors?.email}>
            <Input name="email" type="email" defaultValue={user.email} required />
          </Field>
          <div className="flex justify-end">
            <SubmitButton>Save profile</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={changePassword} resetOnSuccess className="space-y-4">
      {(s) => (
        <>
          <Field label="Current password" name="current" error={s?.fieldErrors?.current}>
            <Input name="current" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="New password" name="password" error={s?.fieldErrors?.password} hint="At least 8 characters.">
            <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <div className="flex justify-end">
            <SubmitButton>Change password</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
