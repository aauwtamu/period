import "server-only";
import { createCache } from "@/lib/utils/cache";
import type { InventorySnapshot } from "@/types/inventory";
export const inventoryCache = createCache<InventorySnapshot>(30_000);
