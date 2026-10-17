"use server";

import { revalidatePath } from "next/cache";
import { decrementSchema, reportSchema } from "@/lib/validation/inventory";
import { writeInventory } from "@/lib/server/sheets-writer";
import { inventoryCache } from "@/lib/server/inventory-cache";
import type { ActionResult } from "@/types/inventory";

async function finish(result: ActionResult) {
  if (result.ok) {
    inventoryCache.invalidate();
    revalidatePath("/");
  }
  return result;
}

// Deliberately public: only the two narrow inventory operations are exposed.
// The writer repeats validation and reads authoritative counts under its lock.
export async function decrementItem(input: unknown): Promise<ActionResult> {
  const parsed = decrementSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      code: "INVALID",
      message: "Please choose a valid bathroom and product.",
    };
  return finish(await writeInventory({ ...parsed.data, event: "take" }));
}

export async function flagBathroom(input: unknown): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      code: "INVALID",
      message: "Please choose a valid bathroom and report reason.",
    };
  return finish(await writeInventory({ ...parsed.data, event: "report" }));
}
