import "server-only";
import { getSheetsClient } from "./sheets-client";
import { inventoryCache } from "./inventory-cache";
import { parseBathrooms } from "@/lib/utils/inventory";
import type { InventoryLoad } from "@/types/inventory";

export async function getInventory(): Promise<InventoryLoad> {
  try {
    const snapshot = await inventoryCache.get(async () => {
      const fetchedAt = Date.now();
      const { client, spreadsheetId } = getSheetsClient();
      const { data } = await client.spreadsheets.values.batchGet(
        {
          spreadsheetId,
          ranges: ["'Bathrooms'!A:Z", "'Summary'!B2"],
        },
        { timeout: 15_000, retry: false },
      );
      const bathrooms = parseBathrooms(data.valueRanges?.[0].values ?? []);
      const raw = data.valueRanges?.[1].values?.[0]?.[0];
      const distributed = Number(raw);
      if (
        raw === undefined ||
        !Number.isSafeInteger(distributed) ||
        distributed < 0
      )
        throw new Error("Invalid summary");
      return { bathrooms, distributed, fetchedAt };
    });
    return { ok: true, snapshot };
  } catch {
    // Do not log Google error objects: their request configuration can hold tokens.
    console.error(
      "Inventory read failed. Check Sheets configuration, schema, and API availability.",
    );
    return {
      ok: false,
      message:
        "We couldn’t load the latest counts. Please try again in a moment.",
    };
  }
}
