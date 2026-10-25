// Shared by Server Actions and the Client Components that call them, so this
// file must not import anything server-only (Prisma, lib/errors). The
// server-side helpers that build these values live in lib/form-actions.ts.

/**
 * What a form's Server Action returns to useActionState.
 * `error` is a message for the whole form, `fieldErrors` sit next to inputs.
 */
export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  // What the user typed, sent back on failure: React resets a form after its
  // action runs, and these become the inputs' defaultValue so nothing is lost.
  values?: Record<string, string>;
};

export const initialActionState: ActionState = {};
