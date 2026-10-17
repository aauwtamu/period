import "server-only";
import { z } from "zod";
import { parseBathrooms } from "@/lib/utils/inventory";
import type { ActionResult } from "@/types/inventory";

const responseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    applied: z.boolean(),
    values: z.array(z.array(z.unknown())),
    distributed: z.number().int().nonnegative(),
    fetchedAt: z.number().positive(),
  }),
  z.object({ ok: z.literal(false), code: z.string() }),
]);

const messages: Record<string, string> = {
  EMPTY: "That product is out of stock. Try another bathroom nearby.",
  NOT_FOUND: "This bathroom is no longer listed. Refresh and try again.",
  INVALID: "That request isn’t valid. Refresh and try again.",
  BUSY: "Another update is finishing. Please try again.",
  CONFIG: "Updates are temporarily unavailable. Please try again later.",
  UNAUTHORIZED: "Updates are temporarily unavailable. Please try again later.",
  DATA: "This location’s counts need checking. Please try another location.",
};

export async function writeInventory(payload: object): Promise<ActionResult> {
  const url = process.env.SHEETS_WRITER_URL;
  const secret = process.env.SHEETS_WRITER_SECRET;
  if (!url || !secret)
    return { ok: false, code: "CONFIG", message: messages.CONFIG };
  try {
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url))
      return { ok: false, code: "CONFIG", message: messages.CONFIG };
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, secret }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
      redirect: "follow",
    });
    if (!response.ok) throw new Error("Writer unavailable");
    const result = responseSchema.parse(await response.json());
    if (!result.ok) {
      if (!messages[result.code]) throw new Error("Unknown write outcome");
      return { ok: false, code: result.code, message: messages[result.code] };
    }
    return {
      ok: true,
      applied: result.applied,
      snapshot: {
        bathrooms: parseBathrooms(result.values),
        distributed: result.distributed,
        fetchedAt: result.fetchedAt,
      },
    };
  } catch {
    return {
      ok: false,
      code: "UNKNOWN",
      uncertain: true,
      message:
        "We couldn’t confirm that update. Retry the same action below; it won’t be counted twice.",
    };
  }
}
