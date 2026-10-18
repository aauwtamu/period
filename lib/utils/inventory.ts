import type { Bathroom } from "@/types/inventory";

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

export function isLowStock(
  counts: Pick<Bathroom, "pads" | "tampons" | "liners">,
) {
  return counts.pads <= 3 && counts.tampons <= 3 && counts.liners <= 3;
}

export function restockRecordedInSheet(values: unknown[][], bathroomId: string) {
  const headers = (values[0] ?? []).map((value) => String(value).trim());
  const idColumn = headers.indexOf("ID");
  const restockColumn = headers.indexOf("Needs Restock");
  if (idColumn < 0 || restockColumn < 0)
    throw new Error("Missing bathroom restock flag");
  const row = values
    .slice(1)
    .find((item) => String(item[idColumn] ?? "").trim() === bathroomId);
  if (!row) throw new Error("Missing bathroom restock flag");
  return ["true", "yes"].includes(
    String(row[restockColumn] ?? "").trim().toLowerCase(),
  );
}

export function parseBathrooms(values: unknown[][]): Bathroom[] {
  const headers = (values[0] ?? []).map(String);
  for (const name of HEADERS) {
    if (headers.filter((h) => h.trim() === name).length !== 1) {
      throw new Error(`Missing or duplicate column: ${name}`);
    }
  }
  const ids = new Set<string>();
  // Google fills checkbox validation cells with FALSE even in unused rows.
  return values
    .slice(1)
    .filter((r) =>
      r.some(
        (v, i) =>
          headers[i]?.trim() !== "Needs Restock" && String(v ?? "").trim(),
      ),
    )
    .map((row) => {
      const value = (name: string) =>
        row[headers.findIndex((h) => h.trim() === name)];
      const str = (name: string) => String(value(name) ?? "").trim();
      const id = str("ID");
      if (!id || ids.has(id))
        throw new Error("Missing or duplicate bathroom ID");
      ids.add(id);
      if (!str("Building") || !str("Room"))
        throw new Error(`Missing location for ${id}`);
      const count = (name: string) => {
        const raw = value(name);
        if (
          (typeof raw !== "string" && typeof raw !== "number") ||
          String(raw).trim() === ""
        )
          throw new Error(`Invalid ${name} count for ${id}`);
        const n = Number(raw);
        if (!Number.isSafeInteger(n) || n < 0)
          throw new Error(`Invalid ${name} count for ${id}`);
        return n;
      };
      const flag = str("Needs Restock").toLowerCase();
      if (!["true", "false", "yes", "no", ""].includes(flag))
        throw new Error(`Invalid restock flag for ${id}`);
      const coordinate = (name: string, limit: number) => {
        const raw = str(name);
        const n = Number(raw);
        return raw && Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
      };
      const date = str("Last Updated");
      const pads = count("Pads");
      const tampons = count("Tampons");
      const liners = count("Liners");
      return {
        id,
        building: str("Building"),
        room: str("Room"),
        floor: str("Floor"),
        pads,
        tampons,
        liners,
        other: count("Other"),
        supplier: str("Supplier"),
        socials: str("Socials"),
        needsRestock:
          ["true", "yes"].includes(flag) ||
          isLowStock({ pads, tampons, liners }),
        latitude: coordinate("Latitude", 90),
        longitude: coordinate("Longitude", 180),
        lastUpdated: date && !Number.isNaN(Date.parse(date)) ? date : null,
      };
    });
}

export function inventoryStats(bathrooms: Bathroom[]) {
  return bathrooms.reduce(
    (stats, b) => ({
      available: stats.available + b.pads + b.tampons + b.liners,
      flagged: stats.flagged + Number(b.needsRestock),
    }),
    { available: 0, flagged: 0 },
  );
}

export function alphabetical(a: Bathroom, b: Bathroom) {
  return (
    a.building.localeCompare(b.building, undefined, { numeric: true }) ||
    a.room.localeCompare(b.room, undefined, { numeric: true })
  );
}
