"use client";

import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field, Input, Select } from "@/components/ui";
import { createOrg, login, requestReset, resetPassword, signup } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={login} className="mt-8 space-y-4">
      {(s) => (
        <>
          <input type="hidden" name="next" value={next ?? ""} />
          <Field label="Email" name="email" error={s?.fieldErrors?.email}>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password" name="password" error={s?.fieldErrors?.password}>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <SubmitButton className="w-full">Sign in</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function SignupForm({ invite, email }: { invite?: string; email?: string }) {
  return (
    <ActionForm action={signup} className="mt-8 space-y-4">
      {(s) => (
        <>
          {invite && <input type="hidden" name="invite" value={invite} />}
          <Field label="Full name" name="name" error={s?.fieldErrors?.name}>
            <Input id="name" name="name" autoComplete="name" required />
          </Field>
          <Field label="Work email" name="email" error={s?.fieldErrors?.email}>
            <Input id="email" name="email" type="email" autoComplete="email" defaultValue={email} required />
          </Field>
          <Field label="Password" name="password" error={s?.fieldErrors?.password} hint="At least 8 characters.">
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </Field>
          <SubmitButton className="w-full">Create account</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ForgotForm() {
  return (
    <ActionForm action={requestReset} className="mt-8 space-y-4">
      {(s) => (
        <>
          <Field label="Email" name="email" error={s?.fieldErrors?.email}>
            <Input id="email" name="email" type="email" required />
          </Field>
          <SubmitButton className="w-full">Send reset link</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ResetForm({ token }: { token: string }) {
  return (
    <ActionForm action={resetPassword} className="mt-8 space-y-4">
      {(s) => (
        <>
          <input type="hidden" name="token" value={token} />
          <Field label="New password" name="password" error={s?.fieldErrors?.password} hint="At least 8 characters.">
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </Field>
          <SubmitButton className="w-full">Update password</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function OnboardingForm() {
  return (
    <ActionForm action={createOrg} className="mt-6 space-y-4">
      {(st) => (
        <>
          <Field label="Company name" name="name" error={st?.fieldErrors?.name}>
            <Input id="name" name="name" placeholder="Your company name" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency" name="currency">
              <Select id="currency" name="currency" defaultValue="USD">
                {["USD", "EUR", "GBP", "PHP", "AUD", "CAD", "SGD", "JPY"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tax rate %" name="taxRate" error={st?.fieldErrors?.taxRate}>
              <Input id="taxRate" name="taxRate" type="number" step="0.01" min="0" max="50" defaultValue="0" />
            </Field>
          </div>
          <SubmitButton className="w-full">Create workspace</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
