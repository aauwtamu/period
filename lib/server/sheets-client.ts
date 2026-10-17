import "server-only";
import { auth, sheets } from "googleapis/build/src/apis/sheets";

export function getSheetsClient() {
  const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!email || !key || !spreadsheetId)
    throw new Error("Missing Sheets configuration");
  return {
    spreadsheetId,
    client: sheets({
      version: "v4",
      auth: new auth.JWT({
        email,
        key: key.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      }),
    }),
  };
}
