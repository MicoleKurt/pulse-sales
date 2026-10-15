"use client";

import { ActionForm, SubmitButton } from "@/components/form";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { createAnnouncement } from "../actions";

export function AnnouncementForm({ orgs }: { orgs: { id: string; name: string }[] }) {
  return (
    <ActionForm action={createAnnouncement} resetOnSuccess className="space-y-4">
      {(s) => (
        <>
          <Field label="Message" name="message" error={s?.fieldErrors?.message}>
            <Textarea name="message" maxLength={300} placeholder="Scheduled maintenance Saturday 2–3 AM UTC." required />
          </Field>
          <Field label="Audience" name="orgId">
            <Select name="orgId" defaultValue="">
              <option value="">All workspaces</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </Select>
          </Field>
          <Field label="Show for (days)" name="days">
            <Input name="days" type="number" min="1" max="60" defaultValue="7" />
          </Field>
          <SubmitButton className="w-full">Publish</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
