"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { decrementSchema, reportSchema } from "@/lib/validation/inventory";
import { writeInventory } from "@/lib/server/sheets-writer";
import { inventoryCache } from "@/lib/server/inventory-cache";
import type { ActionResult } from "@/types/inventory";

async function finish(result: ActionResult): Promise<ActionResult> {
  if (result.ok) {
    inventoryCache.invalidate();
    revalidatePath("/");
    return { ok: true, applied: result.applied, snapshot: result.snapshot };
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
  const take = await writeInventory({ ...parsed.data, event: "take" });
  if (!take.ok) return finish(take);
  const bathroom = take.snapshot.bathrooms.find(
    (item) => item.id === parsed.data.bathroomId,
  );
  if (bathroom?.needsRestock && !take.sheetNeedsRestock) {
    const report = await writeInventory({
      bathroomId: parsed.data.bathroomId,
      requestId: randomUUID(),
      event: "report",
      reason: "restock",
    });
    if (!report.ok || !report.sheetNeedsRestock) {
      inventoryCache.invalidate();
      revalidatePath("/");
      return {
        ok: false,
        code: "UNKNOWN",
        uncertain: true,
        message:
          "Your item was recorded, but we couldn’t confirm the restock report. Retry to finish reporting; your item won’t be counted twice.",
      };
    }
    return finish({ ok: true, applied: take.applied, snapshot: report.snapshot });
  }
  return finish(take);
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
