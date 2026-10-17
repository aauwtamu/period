import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { HEADERS } from "@/lib/utils/inventory";

// Execute the actual deployable Apps Script with a fake Google API. This tests
// the same writer source the owner deploys, including its atomic batch shape.
function harness(stock = 1) {
  const bathrooms: unknown[][] = [
    HEADERS,
    [
      "ZACH-W204",
      "ZACH",
      "W204",
      "2",
      stock,
      10,
      10,
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
            start: { rowIndex: number; columnIndex: number };
            rows: { values: Parameters<typeof decode>[0][] }[];
          };
          nextBath[update.start.rowIndex][update.start.columnIndex] = decode(
            update.rows[0].values[0],
          );
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
          requestId: "ffea0634-3c5d-4825-a7d3-54b57434eb90",
          ...payload,
        }),
      },
    });
  return {
    request,
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
    expect(h.batchUpdate.mock.calls[0][0].requests).toHaveLength(3);
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
