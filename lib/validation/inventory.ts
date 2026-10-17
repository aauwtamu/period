import { z } from "zod";
import { ITEMS } from "@/types/inventory";

const common = {
  bathroomId: z.string().trim().min(1).max(100),
  requestId: z.uuid(),
};

export const decrementSchema = z
  .object({ ...common, item: z.enum(ITEMS) })
  .strict();
export const reportSchema = z
  .object({
    ...common,
    reason: z.literal("restock"),
  })
  .strict();
