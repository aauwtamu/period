import { describe, expect, it } from "vitest";
import { HEADERS, parseBathrooms, inventoryStats } from "@/lib/utils/inventory";
import { decrementSchema, reportSchema } from "@/lib/validation/inventory";
import { migrateRows } from "../scripts/setup-sheets.mjs";

const row = [
  "ZACH-W204",
  "ZACH",
  "W204",
  "2",
  "20",
  "10",
  "10",
  "5",
  "AAUW",
  "@aauw.tamu",
  "TRUE",
  "30.6213",
  "-96.3403",
  "2026-09-27",
];
describe("inventory normalization", () => {
  it("maps headers independently of order and excludes Other from available totals", () => {
    const bathrooms = parseBathrooms([
      [...HEADERS].reverse(),
      [...row].reverse(),
    ]);
    expect(bathrooms[0]).toMatchObject({
      id: "ZACH-W204",
      pads: 20,
      latitude: 30.6213,
      needsRestock: true,
    });
    expect(inventoryStats(bathrooms)).toEqual({ available: 40, flagged: 1 });
  });
  it("rejects missing headers, duplicate IDs, and invalid counts", () => {
    expect(() => parseBathrooms([HEADERS.slice(1), row])).toThrow();
    expect(() => parseBathrooms([HEADERS, row, row])).toThrow(/duplicate/);
    for (const value of ["", "-1", "2.5", "nope", true]) {
      const invalid = [...row] as unknown[];
      invalid[4] = value;
      expect(() => parseBathrooms([HEADERS, invalid])).toThrow(/count/);
    }
  });
  it("preserves zero and treats missing optional values as absent", () => {
    const input = [...row];
    input[4] = "0";
    input[9] = "";
    input[11] = "—";
    input[12] = "";
    input[13] = "";
    expect(parseBathrooms([HEADERS, input])[0]).toMatchObject({
      pads: 0,
      socials: "",
      latitude: null,
      longitude: null,
      lastUpdated: null,
    });
  });
  it("marks a location reported when all three main products are at most three", () => {
    const low = [...row];
    low[4] = "3";
    low[5] = "3";
    low[6] = "0";
    low[10] = "FALSE";
    expect(parseBathrooms([HEADERS, low])[0].needsRestock).toBe(true);
    low[5] = "4";
    expect(parseBathrooms([HEADERS, low])[0].needsRestock).toBe(false);
  });
  it("ignores unused rows with Google-created unchecked checkbox values", () => {
    const empty = Array(11).fill("");
    empty[10] = "FALSE";
    expect(parseBathrooms([HEADERS, row, empty])).toHaveLength(1);
    expect(migrateRows([HEADERS, row, empty])).toHaveLength(2);
  });
});
describe("request validation", () => {
  const base = {
    bathroomId: "ZACH-W204",
    requestId: "ffea0634-3c5d-4825-a7d3-54b57434eb90",
  };
  it("accepts only the intended item and report operations", () => {
    expect(decrementSchema.safeParse({ ...base, item: "pads", quantity: 1 }).success).toBe(
      true,
    );
    expect(
      decrementSchema.safeParse({ ...base, item: "pads", quantity: 5, count: 999 }).success,
    ).toBe(false);
    expect(
      decrementSchema.safeParse({ ...base, item: "__proto__", quantity: 1 }).success,
    ).toBe(false);
    expect(
      reportSchema.safeParse({ ...base, reason: "restock" }).success,
    ).toBe(true);
    expect(reportSchema.safeParse({ ...base, reason: "other" }).success).toBe(
      false,
    );
    expect(reportSchema.safeParse({ ...base, reason: "dispenser" }).success).toBe(false);
    expect(
      decrementSchema.safeParse({ ...base, requestId: "bad", item: "pads", quantity: 1 })
        .success,
    ).toBe(false);
    for (const quantity of [0, 6, 1.5, "2"])
      expect(decrementSchema.safeParse({ ...base, item: "pads", quantity }).success).toBe(false);
  });
});
describe("sheet migration", () => {
  const oldHeaders = HEADERS.slice(1).map((h) =>
    h === "Building"
      ? "Location"
      : h === "Needs Restock"
        ? "Need Restock?"
        : h,
  );
  it("preserves stock, creates stable IDs, and converts Yes to checkbox true", () => {
    const legacy = row.slice(1);
    legacy[9] = "Yes";
    const result = migrateRows([oldHeaders, legacy]);
    expect(result[0]).toEqual(HEADERS);
    expect(result[1]).toEqual([
      "ZACH-W204",
      "ZACH",
      "W204",
      "2",
      20,
      10,
      10,
      5,
      "AAUW",
      "@aauw.tamu",
      true,
      "30.6213",
      "-96.3403",
      "2026-09-27",
    ]);
    expect(migrateRows(result)).toEqual(result);
  });
  it("refuses collisions and unknown columns instead of dropping data", () => {
    expect(() => migrateRows([oldHeaders, row.slice(1), row.slice(1)])).toThrow(
      /Duplicate ID/,
    );
    expect(() => migrateRows([[...oldHeaders, "Notes"], row.slice(1)])).toThrow(
      /Unrecognized/,
    );
  });
});
