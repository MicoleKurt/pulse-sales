"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/action";
import { Alert, Button, type Variant } from "./ui";

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

export function SubmitButton({ children, variant, size, className }: { children: React.ReactNode; variant?: Variant; size?: "sm" | "md"; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending} className={className}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}

/**
 * Form bound to a server action. Children can be a render function to read
 * field errors. Shows the action's error/success message.
 */
export function ActionForm({
  action,
  children,
  className,
  successMessage,
  resetOnSuccess,
}: {
  action: Action;
  children: React.ReactNode | ((state: ActionState) => React.ReactNode);
  className?: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && (state.message || successMessage) && <Alert tone="success">{state.message ?? successMessage}</Alert>}
      {typeof children === "function" ? children(state) : children}
    </form>
  );
}

/** A one-button form for actions like delete/restore, with optional confirm. */
export function ActionButton({
  action,
  children,
  confirm,
  variant = "secondary",
  size = "sm",
  fields,
}: {
  action: Action;
  children: React.ReactNode;
  confirm?: string;
  variant?: Variant;
  size?: "sm" | "md";
  fields?: Record<string, string>;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline-flex flex-col items-end gap-1"
    >
      {fields && Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton variant={variant} size={size}>
        {children}
      </SubmitButton>
      {state?.error && <span className="max-w-56 text-right text-xs text-danger">{state.error}</span>}
    </form>
  );
}
