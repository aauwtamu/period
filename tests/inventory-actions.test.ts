import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult, Bathroom } from "@/types/inventory";

const { writeInventory, invalidate, revalidatePath } = vi.hoisted(() => ({
  writeInventory: vi.fn(),
  invalidate: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/server/sheets-writer", () => ({ writeInventory }));
vi.mock("@/lib/server/inventory-cache", () => ({
  inventoryCache: { invalidate },
}));
vi.mock("next/cache", () => ({ revalidatePath }));

import { decrementItem } from "@/app/actions/inventory";

const bathroom: Bathroom = {
  id: "ZACH-W204",
  building: "ZACH",
  room: "W204",
  floor: "2",
  pads: 3,
  tampons: 3,
  liners: 3,
  other: 5,
  supplier: "AAUW",
  socials: "",
  needsRestock: true,
  latitude: null,
  longitude: null,
  lastUpdated: null,
};

const input = {
  bathroomId: bathroom.id,
  requestId: "ffea0634-3c5d-4825-a7d3-54b57434eb90",
  item: "pads",
  quantity: 1,
};

function success(sheetNeedsRestock: boolean, applied = true) {
  return {
    ok: true,
    applied,
    sheetNeedsRestock,
    snapshot: { bathrooms: [bathroom], distributed: 1, fetchedAt: 1 },
  };
}

describe("automatic restock persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("confirms an automatic report when an older writer leaves the sheet flag unchecked", async () => {
    writeInventory
      .mockResolvedValueOnce(success(false))
      .mockResolvedValueOnce(success(true));

    const result: ActionResult = await decrementItem(input);

    expect(result).toMatchObject({ ok: true, applied: true });
    expect(writeInventory).toHaveBeenCalledTimes(2);
    expect(writeInventory).toHaveBeenNthCalledWith(2, {
      bathroomId: bathroom.id,
      event: "report",
      reason: "restock",
      requestId: expect.any(String),
    });
    expect(invalidate).toHaveBeenCalledOnce();
  });

  it("does not send a second write when the sheet flag was already stored", async () => {
    writeInventory.mockResolvedValueOnce(success(true));

    expect(await decrementItem(input)).toMatchObject({ ok: true });
    expect(writeInventory).toHaveBeenCalledTimes(1);
  });

  it("keeps the same Take request retryable if its follow-up report is uncertain", async () => {
    writeInventory
      .mockResolvedValueOnce(success(false))
      .mockResolvedValueOnce({ ok: false, code: "UNKNOWN", uncertain: true })
      .mockResolvedValueOnce(success(false, false))
      .mockResolvedValueOnce(success(true));

    expect(await decrementItem(input)).toMatchObject({
      ok: false,
      uncertain: true,
    });
    expect(await decrementItem(input)).toMatchObject({
      ok: true,
      applied: false,
    });
    expect(writeInventory.mock.calls[0][0].requestId).toBe(input.requestId);
    expect(writeInventory.mock.calls[2][0].requestId).toBe(input.requestId);
    expect(invalidate).toHaveBeenCalledTimes(2);
  });
});
