import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { HEADERS } from "@/lib/utils/inventory";

// Execute the actual deployable Apps Script with a fake Google API. This tests
// the same writer source the owner deploys, including its atomic batch shape.
function harness(stock = 1, tampons = 10, liners = 10) {
  const bathrooms: unknown[][] = [
    HEADERS,
    [
      "ZACH-W204",
      "ZACH",
      "W204",
      "2",
      stock,
      tampons,
      liners,
      5,
      "AAUW",
      "",
      false,
      30.62,
      -96.34,
      "2026-09-27",
    ],
  ];
  const log: unknown[][] = [
    ["Timestamp", "Bathroom ID", "Item", "Event", "Request ID", "Reason"],
  ];
  const summary: unknown[][] = [["Tracking started", ""], ["Distributed since launch", 0]];
  let held = false;
  const release = vi.fn(() => {
    held = false;
  });
  const batchUpdate = vi.fn(
    (body: { requests: Array<Record<string, unknown>> }) => {
      const nextBath = structuredClone(bathrooms);
      const nextLog = structuredClone(log);
      const decode = (cell: { userEnteredValue: Record<string, unknown> }) =>
        Object.values(cell.userEnteredValue)[0];
      for (const request of body.requests) {
        if (request.updateCells) {
          const update = request.updateCells as {
            start: { sheetId: number; rowIndex: number; columnIndex: number };
            rows: { values: Parameters<typeof decode>[0][] }[];
          };
          const target = update.start.sheetId === 1 ? nextBath : update.start.sheetId === 2 ? nextLog : summary;
          target[update.start.rowIndex][update.start.columnIndex] = decode(update.rows[0].values[0]);
        } else {
          const append = request.appendCells as {
            rows: { values: Parameters<typeof decode>[0][] }[];
          };
          nextLog.push(append.rows[0].values.map(decode));
        }
      }
      bathrooms.splice(0, bathrooms.length, ...nextBath);
      log.splice(0, log.length, ...nextLog);
    },
  );
  const context = vm.createContext({
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (text: string) => ({
        setMimeType: () => JSON.parse(text),
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key: string) =>
          key === "SHEETS_WRITER_SECRET" ? "test-secret" : "test-sheet",
      }),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => {
          if (held) return false;
          held = true;
          return true;
        },
        releaseLock: release,
      }),
    },
    Sheets: {
      Spreadsheets: {
        get: () => ({
          sheets: [
            { properties: { title: "Bathrooms", sheetId: 1 } },
            { properties: { title: "Log", sheetId: 2 } },
            { properties: { title: "Summary", sheetId: 3 } },
          ],
        }),
        Values: {
          batchGet: () => ({
            valueRanges: [
              { values: structuredClone(bathrooms) },
              { values: structuredClone(log) },
            ],
          }),
        },
        batchUpdate,
      },
    },
  });
  vm.runInContext(
    readFileSync(new URL("../apps-script/Code.gs", import.meta.url), "utf8"),
    context,
  );
  const request = (payload: object) =>
    context.doPost({
      postData: {
        contents: JSON.stringify({
          secret: "test-secret",
          bathroomId: "ZACH-W204",
          event: "take",
          item: "pads",
          quantity: 1,
          requestId: "ffea0634-3c5d-4825-a7d3-54b57434eb90",
          ...payload,
        }),
      },
    });
  const editBathroom = () => {
    const sheet = {
      getName: () => "Bathrooms",
      getLastColumn: () => HEADERS.length,
      getRange: (row: number, column: number, height = 1, width = 1) => ({
        getValues: () =>
          bathrooms
            .slice(row - 1, row - 1 + height)
            .map((values) => values.slice(column - 1, column - 1 + width)),
        setValue: (value: unknown) => {
          bathrooms[row - 1][column - 1] = value;
        },
      }),
    };
    context.onEdit({
      range: { getSheet: () => sheet, getRow: () => 2, getLastRow: () => 2 },
    });
  };
  return {
    request,
    editBathroom,
    bathrooms,
    log,
    batchUpdate,
    release,
    setHeld: () => {
      held = true;
    },
  };
}

describe("Apps Script writer", () => {
  it("rejects dispenser reports and accepts restock requests", () => {
    const h = harness();
    expect(h.request({ event: "report", item: undefined, reason: "dispenser" })).toMatchObject({ ok: false, code: "INVALID" });
    expect(h.batchUpdate).not.toHaveBeenCalled();
    expect(h.request({ event: "report", item: undefined, reason: "restock" })).toMatchObject({ ok: true, applied: true });
    expect(h.bathrooms[1][10]).toBe(true);
  });
  it("commits stock, timestamp, and audit atomically; replay is a no-op", () => {
    const h = harness();
    expect(h.request({})).toMatchObject({
      ok: true,
      applied: true,
      distributed: 1,
    });
    expect(h.bathrooms[1][4]).toBe(0);
    expect(h.bathrooms[1][13]).toMatch(/^\d{4}-.*T.*Z$/);
    expect(h.log).toHaveLength(2);
    expect(h.batchUpdate.mock.calls[0][0].requests).toHaveLength(5);
    expect(h.request({})).toMatchObject({
      ok: true,
      applied: false,
      distributed: 1,
    });
    expect(h.batchUpdate).toHaveBeenCalledTimes(1);
  });
  it("rejects a changed payload with the same request ID", () => {
    const h = harness();
    h.request({});
    expect(h.request({ item: "tampons" })).toMatchObject({
      ok: false,
      code: "INVALID",
    });
    expect(h.request({ quantity: 2 })).toMatchObject({ ok: false, code: "INVALID" });
  });
  it("takes up to five atomically and counts historical single-item rows", () => {
    const h = harness(8);
    expect(h.request({ quantity: 1 })).toMatchObject({ ok: true, distributed: 1 });
    h.log[1][6] = ""; // Existing take rows have no quantity.
    expect(h.log[0][6]).toBe("Quantity");
    expect(h.request({ quantity: 5, requestId: "ffea0634-3c5d-4825-a7d3-54b57434eb91" })).toMatchObject({ ok: true, distributed: 6 });
    expect(h.bathrooms[1][4]).toBe(2);
    expect(h.log[2][6]).toBe(5);
    expect(h.request({ quantity: 3, requestId: "ffea0634-3c5d-4825-a7d3-54b57434eb92" })).toMatchObject({ ok: false, code: "EMPTY" });
  });
  it("flags restock in the same batch when a take leaves every main product at three or fewer", () => {
    const h = harness(4, 3, 3);
    expect(h.request({})).toMatchObject({ ok: true, applied: true });
    expect(h.bathrooms[1][4]).toBe(3);
    expect(h.bathrooms[1][10]).toBe(true);
    expect(h.log).toHaveLength(2);
    expect(h.batchUpdate).toHaveBeenCalledTimes(1);
    const stillStocked = harness(4, 3, 4);
    stillStocked.request({});
    expect(stillStocked.bathrooms[1][10]).toBe(false);
  });
  it("flags low stock after a direct spreadsheet edit", () => {
    const low = harness(3, 3, 3);
    low.editBathroom();
    expect(low.bathrooms[1][10]).toBe(true);
    const stocked = harness(3, 4, 3);
    stocked.editBathroom();
    expect(stocked.bathrooms[1][10]).toBe(false);
  });
  it("rejects quantities outside one to five", () => {
    const h = harness(10);
    for (const quantity of [0, 6, 1.5, "2", null])
      expect(h.request({ quantity })).toMatchObject({ ok: false, code: "INVALID" });
    expect(h.batchUpdate).not.toHaveBeenCalled();
  });
  it("handles competing requests against the last item without a negative count", async () => {
    const h = harness();
    const results = await Promise.all([
      Promise.resolve().then(() => h.request({})),
      Promise.resolve().then(() =>
        h.request({ requestId: "ffea0634-3c5d-4825-a7d3-54b57434eb91" }),
      ),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results[1]).toMatchObject({ ok: false, code: "EMPTY" });
    expect(h.log).toHaveLength(2);
    expect(h.bathrooms[1][4]).toBe(0);
  });
  it("refuses a busy lock, invalid secret, unknown item, and unknown bathroom", () => {
    const h = harness();
    expect(h.request({ secret: "wrong" })).toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(h.request({ item: "__proto__" })).toMatchObject({ code: "INVALID" });
    expect(h.request({ bathroomId: "missing" })).toMatchObject({
      code: "NOT_FOUND",
    });
    h.setHeld();
    expect(h.request({})).toMatchObject({ code: "BUSY" });
    expect(h.batchUpdate).not.toHaveBeenCalled();
  });
  it("flags once, logs the reason, and does not count a report as distribution", () => {
    const h = harness();
    expect(
      h.request({ event: "report", item: undefined, reason: "restock" }),
    ).toMatchObject({ ok: true, applied: true, distributed: 0 });
    expect(h.bathrooms[1][10]).toBe(true);
    expect(h.log[1][5]).toBe("restock");
    expect(
      h.request({
        event: "report",
        item: undefined,
        reason: "restock",
        requestId: "ffea0634-3c5d-4825-a7d3-54b57434eb91",
      }),
    ).toMatchObject({ ok: true, applied: false });
    expect(h.log).toHaveLength(2);
  });
  it("fails safely on bad data and releases the lock on an uncertain transport error", () => {
    const bad = harness(-1);
    expect(bad.request({})).toMatchObject({ code: "DATA" });
    expect(bad.batchUpdate).not.toHaveBeenCalled();
    const h = harness();
    h.batchUpdate.mockImplementationOnce(() => {
      throw new Error("transport");
    });
    expect(h.request({})).toMatchObject({ code: "UNKNOWN" });
    expect(h.release).toHaveBeenCalled();
  });
  it("does not double-count when the batch committed but its response was lost", () => {
    const h = harness(2);
    const commit = h.batchUpdate.getMockImplementation()!;
    h.batchUpdate.mockImplementationOnce((body) => {
      commit(body);
      throw new Error("response lost after commit");
    });
    expect(h.request({})).toMatchObject({ code: "UNKNOWN" });
    expect(h.bathrooms[1][4]).toBe(1);
    expect(h.request({})).toMatchObject({ ok: true, applied: false, distributed: 1 });
    expect(h.log).toHaveLength(2);
    expect(h.batchUpdate).toHaveBeenCalledTimes(1);
  });
});
