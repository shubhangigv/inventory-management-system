"use server";

import type { ActionState } from "@/lib/action-state";
import { requireAdmin } from "@/lib/auth";
import { toActionError } from "@/lib/form-actions";
import { revalidateApp } from "@/lib/revalidate";
import { runForecast } from "@/lib/services/forecasts";

// Admins only: a run retrains the model, which takes a while and uses the CPU.
export async function runForecastAction(): Promise<ActionState> {
  let message: string;
  try {
    await requireAdmin();
    message = await runForecast();
  } catch (error) {
    return toActionError(error);
  }
  revalidateApp();
  return { ok: true, message };
}
