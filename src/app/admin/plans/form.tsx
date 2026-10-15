"use client";

import { ActionForm, SubmitButton } from "@/components/form";
import { Field, Input } from "@/components/ui";
import { savePlanLimits } from "../actions";

type Limits = { plan: string; pricePerSeat: number; maxSeats: number | null; maxSalesPerMonth: number | null; exports: boolean; auditLog: boolean; advancedReports: boolean };

export function PlanLimitsForm({ limits, disabled }: { limits: Limits; disabled: boolean }) {
  return (
    <ActionForm action={savePlanLimits} className="space-y-4">
      <fieldset disabled={disabled} className="space-y-4">
        <input type="hidden" name="plan" value={limits.plan} />
        <Field label="Price per seat (USD / month)" name="pricePerSeat">
          <Input name="pricePerSeat" type="number" step="0.01" min="0" defaultValue={limits.pricePerSeat} />
        </Field>
        <Field label="Max seats" name="maxSeats" hint="Empty = unlimited">
          <Input name="maxSeats" type="number" min="1" defaultValue={limits.maxSeats ?? ""} />
        </Field>
        <Field label="Max sales / month" name="maxSalesPerMonth" hint="Empty = unlimited">
          <Input name="maxSalesPerMonth" type="number" min="1" defaultValue={limits.maxSalesPerMonth ?? ""} />
        </Field>
        {(
          [
            ["exports", "Exports (CSV / XLSX / PDF)"],
            ["auditLog", "Audit log"],
            ["advancedReports", "Advanced reports"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={k} defaultChecked={limits[k]} className="size-4 accent-[var(--primary)]" /> {label}
          </label>
        ))}
        {!disabled && (
          <div className="flex justify-end">
            <SubmitButton>Save</SubmitButton>
          </div>
        )}
      </fieldset>
    </ActionForm>
  );
}
