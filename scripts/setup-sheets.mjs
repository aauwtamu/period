import nextEnv from "@next/env";
import { auth, sheets } from "googleapis/build/src/apis/sheets/index.js";
import { pathToFileURL } from "node:url";

export const HEADERS = [
  "ID",
  "Building",
  "Room",
  "Floor",
  "Pads",
  "Tampons",
  "Liners",
  "Other",
  "Supplier",
  "Socials",
  "Needs Restock",
  "Latitude",
  "Longitude",
  "Last Updated",
];
export const LOG_HEADERS = [
  "Timestamp",
  "Bathroom ID",
  "Item",
  "Event",
  "Request ID",
  "Reason",
  "Quantity",
];
const DISTRIBUTED_FORMULA =
  '=COUNTIFS(Log!D2:D,"take",Log!G2:G,"")+SUMIF(Log!D2:D,"take",Log!G2:G)';

export function migrateRows(values) {
  const old = values[0]?.map((h) => String(h).trim()) ?? [];
  const aliases = { Building: "Location", "Needs Restock": "Need Restock?" };
  const indices = HEADERS.map((h) =>
    old.indexOf(h) >= 0 ? old.indexOf(h) : old.indexOf(aliases[h]),
  );
  HEADERS.forEach((h, i) => {
    if (h !== "ID" && indices[i] < 0) throw new Error(`Missing column: ${h}`);
  });
  if (new Set(old.filter(Boolean)).size !== old.filter(Boolean).length)
    throw new Error("Duplicate headers. Resolve them before migration.");
  const known = new Set([...HEADERS, ...Object.values(aliases)]);
  if (old.some((h) => h && !known.has(h)))
    throw new Error(
      "Unrecognized columns. Review them before migration; no data was changed.",
    );
  const ids = new Set();
  const output = values
    .slice(1)
    .filter((r) =>
      r.some(
        (v, i) =>
          !["Needs Restock", "Need Restock?"].includes(old[i]) &&
          String(v ?? "").trim(),
      ),
    )
    .map((r) => {
      const row = indices.map((i) => (i < 0 ? "" : (r[i] ?? "")));
      if (!String(row[1]).trim() || !String(row[2]).trim())
        throw new Error("Every inventory row needs a building and room.");
      row[0] = String(row[0] || `${row[1]}-${row[2]}`).trim();
      if (ids.has(row[0]))
        throw new Error(
          `Duplicate ID: ${row[0]}. Add unique permanent IDs before migration.`,
        );
      ids.add(row[0]);
      for (let i = 4; i <= 7; i++) {
        const raw = row[i];
        if (
          !["string", "number"].includes(typeof raw) ||
          String(raw).trim() === "" ||
          !Number.isSafeInteger(Number(raw)) ||
          Number(raw) < 0
        )
          throw new Error(`Invalid ${HEADERS[i]} count in ${row[0]}`);
        row[i] = Number(raw);
      }
      const flag = String(row[10]).toLowerCase().trim();
      if (!["yes", "no", "true", "false", ""].includes(flag))
        throw new Error(`Invalid restock flag in ${row[0]}`);
      row[10] = ["yes", "true"].includes(flag);
      return row;
    });
  return [HEADERS, ...output];
}

export async function main() {
  nextEnv.loadEnvConfig(process.cwd());
  const apply = process.argv.includes("--apply");
  const spreadsheetId =
    process.argv
      .find((a) => a.startsWith("--spreadsheet-id="))
      ?.split("=")[1] || process.env.SPREADSHEET_ID;
  const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key || !spreadsheetId)
    throw new Error("Missing Sheets credentials in .env.local.");
  const client = sheets({
    version: "v4",
    auth: new auth.JWT({
      email,
      key: key.replace(/\\n/g, "\n"),
      scopes: [
        apply
          ? "https://www.googleapis.com/auth/spreadsheets"
          : "https://www.googleapis.com/auth/spreadsheets.readonly",
      ],
    }),
  });
  const options = { timeout: 20_000, retry: false };
  const { data: meta } = await client.spreadsheets.get(
    { spreadsheetId, fields: "sheets.properties" },
    options,
  );
  const tabs = meta.sheets.map((s) => s.properties);
  const source =
    tabs.find((t) => t.title === "Bathrooms") ||
    tabs.find((t) => t.title === "Sheet1");
  if (!source) throw new Error("Expected a Bathrooms or Sheet1 inventory tab.");
  const { data } = await client.spreadsheets.values.get(
    { spreadsheetId, range: `'${source.title}'!A:ZZ` },
    options,
  );
  const values = migrateRows(data.values || []);
  const canonical =
    source.title === "Bathrooms" &&
    JSON.stringify(data.values?.[0]) === JSON.stringify(HEADERS);
  const existingLog = tabs.find((t) => t.title === "Log");
  const existingSummary = tabs.find((t) => t.title === "Summary");
  if (existingLog) {
    const { data: log } = await client.spreadsheets.values.get(
      { spreadsheetId, range: "'Log'!A1:G1" },
      options,
    );
    if (
      JSON.stringify(log.values?.[0]) !== JSON.stringify(LOG_HEADERS) &&
      JSON.stringify(log.values?.[0]) !==
        JSON.stringify(LOG_HEADERS.slice(0, 6))
    )
      throw new Error(
        "Existing Log has a different schema; refusing to overwrite it.",
      );
  }
  if (existingSummary) {
    const { data: summary } = await client.spreadsheets.values.get(
      { spreadsheetId, range: "'Summary'!A1:B2", valueRenderOption: "FORMULA" },
      options,
    );
    if (
      summary.values?.[0]?.[0] !== "Tracking started" ||
      summary.values?.[1]?.[0] !== "Distributed since launch" ||
      !['=COUNTIF(Log!D2:D,"take")', DISTRIBUTED_FORMULA].includes(
        summary.values?.[1]?.[1],
      )
    )
      throw new Error(
        "Existing Summary differs from the expected launch counter; refusing to overwrite it.",
      );
  }
  const usedIds = new Set(tabs.map((t) => t.sheetId));
  const nextId = () => {
    let id = 100;
    while (usedIds.has(id)) id++;
    usedIds.add(id);
    return id;
  };
  const requests = [];
  const cell = (v) => ({
    userEnteredValue:
      typeof v === "number"
        ? { numberValue: v }
        : typeof v === "boolean"
          ? { boolValue: v }
          : { stringValue: String(v) },
  });
  const write = (sheetId, rows) => ({
    updateCells: {
      start: { sheetId, rowIndex: 0, columnIndex: 0 },
      rows: rows.map((r) => ({ values: r.map(cell) })),
      fields: "userEnteredValue",
    },
  });
  if (!canonical) {
    const backupName = `Inventory backup ${new Date().toISOString().replace(/[:.]/g, "-")}`;
    requests.push({
      duplicateSheet: {
        sourceSheetId: source.sheetId,
        newSheetId: nextId(),
        newSheetName: backupName,
      },
    });
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: source.sheetId,
          title: "Bathrooms",
          gridProperties: { frozenRowCount: 1 },
        },
        fields: "title,gridProperties.frozenRowCount",
      },
    });
    requests.push({
      updateCells: {
        range: {
          sheetId: source.sheetId,
          startRowIndex: 0,
          endColumnIndex: 14,
        },
        rows: values.map((r) => ({ values: r.map(cell) })),
        fields: "userEnteredValue",
      },
    });
  }
  const countValidation = {
    condition: {
      type: "CUSTOM_FORMULA",
      values: [{ userEnteredValue: "=AND(ISNUMBER(E2),E2>=0,MOD(E2,1)=0)" }],
    },
    strict: true,
    inputMessage: "Enter a whole number, zero or greater.",
  };
  requests.push({
    setDataValidation: {
      range: {
        sheetId: source.sheetId,
        startRowIndex: 1,
        startColumnIndex: 4,
        endColumnIndex: 8,
      },
      rule: countValidation,
    },
  });
  requests.push({
    setDataValidation: {
      range: {
        sheetId: source.sheetId,
        startRowIndex: 1,
        startColumnIndex: 10,
        endColumnIndex: 11,
      },
      rule: {
        condition: { type: "BOOLEAN" },
        strict: true,
        showCustomUi: true,
      },
    },
  });
  if (!existingLog) {
    const id = nextId();
    requests.push(
      {
        addSheet: {
          properties: {
            sheetId: id,
            title: "Log",
            hidden: true,
            gridProperties: { frozenRowCount: 1 },
          },
        },
      },
      write(id, [LOG_HEADERS]),
    );
  }
  if (existingLog) {
    requests.push({
      updateCells: {
        start: { sheetId: existingLog.sheetId, rowIndex: 0, columnIndex: 6 },
        rows: [{ values: [cell("Quantity")] }],
        fields: "userEnteredValue",
      },
    });
  }
  if (!existingSummary) {
    const id = nextId();
    requests.push(
      { addSheet: { properties: { sheetId: id, title: "Summary" } } },
      write(id, [
        ["Tracking started", new Date().toISOString()],
        ["Distributed since launch", ""],
      ]),
    );
    requests.push({
      updateCells: {
        start: { sheetId: id, rowIndex: 1, columnIndex: 1 },
        rows: [
          {
            values: [
              {
                userEnteredValue: { formulaValue: DISTRIBUTED_FORMULA },
              },
            ],
          },
        ],
        fields: "userEnteredValue",
      },
    });
  }
  if (existingSummary) {
    requests.push({
      updateCells: {
        start: { sheetId: existingSummary.sheetId, rowIndex: 1, columnIndex: 1 },
        rows: [{ values: [{ userEnteredValue: { formulaValue: DISTRIBUTED_FORMULA } }] }],
        fields: "userEnteredValue",
      },
    });
  }
  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "preview",
        inventoryRows: values.length - 1,
        sourceTab: source.title,
        backupAndMigrate: !canonical,
        createLog: !existingLog,
        createSummary: !existingSummary,
        preserveOtherTabs: true,
      },
      null,
      2,
    ),
  );
  if (!apply) {
    console.log(
      "Preview only. Run with --apply to perform the atomic setup batch.",
    );
    return;
  }
  await client.spreadsheets.batchUpdate(
    { spreadsheetId, requestBody: { requests } },
    options,
  );
  console.log(
    "Sheet setup complete. Inventory and existing logs were preserved.",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
