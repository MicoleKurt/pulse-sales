import "server-only";
import { z } from "zod";
import { ActionError } from "./auth";

export type ActionState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined>; message?: string } | null;

/** Wraps a server action: parses FormData with Zod and turns expected errors into form state. */
export function formAction<S extends z.ZodTypeAny>(
  schema: S,
  handler: (data: z.infer<S>, form: FormData) => Promise<ActionState | void>,
) {
  return async (_prev: ActionState, form: FormData): Promise<ActionState> => {
    const parsed = schema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      return { error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }
    try {
      return (await handler(parsed.data, form)) ?? { ok: true };
    } catch (e) {
      if (e instanceof ActionError) return { error: e.message };
      if (isRedirect(e)) throw e;
      console.error(e);
      return { error: "Something went wrong. Please try again." };
    }
  };
}

/** For button-style actions without a form schema. */
export async function guarded(fn: () => Promise<void | ActionState>): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: true };
  } catch (e) {
    if (e instanceof ActionError) return { error: e.message };
    if (isRedirect(e)) throw e;
    console.error(e);
    return { error: "Something went wrong. Please try again." };
  }
}

function isRedirect(e: unknown) {
  return typeof e === "object" && e !== null && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}
