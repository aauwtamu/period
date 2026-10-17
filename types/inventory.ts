export const ITEMS = ["pads", "tampons", "liners", "other"] as const;
export type ItemType = (typeof ITEMS)[number];
export type ReportReason = "restock";

export interface Bathroom {
  id: string;
  building: string;
  room: string;
  floor: string;
  pads: number;
  tampons: number;
  liners: number;
  other: number;
  supplier: string;
  socials: string;
  needsRestock: boolean;
  latitude: number | null;
  longitude: number | null;
  lastUpdated: string | null;
}

export interface InventorySnapshot {
  bathrooms: Bathroom[];
  distributed: number;
  fetchedAt: number;
}

export type InventoryLoad =
  { ok: true; snapshot: InventorySnapshot } | { ok: false; message: string };

export type ActionResult =
  | { ok: true; applied: boolean; snapshot: InventorySnapshot }
  | { ok: false; code: string; message: string; uncertain?: boolean };
