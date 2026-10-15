"use client";

import { useActionState, useTransition } from "react";
import { ActionForm, SubmitButton } from "@/components/form";
import { Alert, Field, Input, Select } from "@/components/ui";
import { inviteMember, saveRights, updateMember } from "./actions";

const ROLES = [
  ["admin", "Admin"],
  ["manager", "Manager"],
  ["rep", "Sales rep"],
] as const;

export function InviteForm({ canOwner }: { canOwner: boolean }) {
  return (
    <ActionForm action={inviteMember} resetOnSuccess className="space-y-3">
      {(s) => (
        <>
          <Field label="Email" name="email" error={s?.fieldErrors?.email}>
            <Input name="email" type="email" placeholder="name@company.com" required />
          </Field>
          <Field label="Role" name="role">
            <Select name="role" defaultValue="rep">
              {canOwner && <option value="owner">Owner</option>}
              {ROLES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </Field>
          <SubmitButton className="w-full">Send invite</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function MemberRoleSelect({ id, role, canOwner }: { id: string; role: string; canOwner: boolean }) {
  const [state, action] = useActionState(updateMember, null);
  const [pending, start] = useTransition();
  return (
    <div>
      <select
        defaultValue={role}
        disabled={pending}
        aria-label="Role"
        className="h-8 rounded-lg border border-border bg-surface px-2 text-sm"
        onChange={(e) => {
          const f = new FormData();
          f.set("id", id);
          f.set("role", e.target.value);
          start(() => action(f));
        }}
      >
        {canOwner && <option value="owner">Owner</option>}
        {ROLES.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      {state?.error && <p className="mt-1 text-xs text-danger">{state.error}</p>}
    </div>
  );
}

export function RightsMatrix({ rights, allowed }: { rights: { code: string; label: string }[]; allowed: Record<string, boolean> }) {
  const [state, action] = useActionState(saveRights, null);
  return (
    <form action={action}>
      {state?.error && <div className="px-5 pt-4"><Alert>{state.error}</Alert></div>}
      {state?.ok && <div className="px-5 pt-4"><Alert tone="success">{state.message}</Alert></div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2/60 text-xs text-muted">
              <th className="px-5 py-2.5 text-left font-medium">Right</th>
              <th className="px-3 py-2.5 font-medium">Owner</th>
              {ROLES.map(([, l]) => (
                <th key={l} className="px-3 py-2.5 font-medium">{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rights.map((r) => (
              <tr key={r.code} className="border-b border-border">
                <td className="px-5 py-2.5">
                  <p className="font-medium">{r.label}</p>
                  <p className="font-mono text-[11px] text-muted">{r.code}</p>
                </td>
                <td className="text-center"><input type="checkbox" checked disabled aria-label={`Owner ${r.code}`} className="size-4 accent-[var(--primary)]" /></td>
                {ROLES.map(([role]) => (
                  <td key={role} className="text-center">
                    <input type="checkbox" name={`${role}:${r.code}`} defaultChecked={!!allowed[`${role}:${r.code}`]} aria-label={`${role} ${r.code}`} className="size-4 accent-[var(--primary)]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end p-4">
        <SubmitButton>Save rights</SubmitButton>
      </div>
    </form>
  );
}
