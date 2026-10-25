import { revalidatePath } from "next/cache";

/**
 * Call after any change to the data. Almost every page shows numbers that one
 * change affects (a sale moves stock, the dashboard, the ledger...), so the
 * whole app is refreshed instead of tracking which pages depend on what.
 */
export function revalidateApp() {
  revalidatePath("/", "layout");
}
