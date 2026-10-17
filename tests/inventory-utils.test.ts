import { describe, expect, it, vi } from "vitest";
import { createCache } from "@/lib/utils/cache";
import { distanceKm } from "@/lib/utils/distance";
import { relativeTime } from "@/lib/utils/dates";
import { remainingCooldown } from "@/hooks/use-bathroom-cooldown";

describe("short-lived cache", () => {
  it("coalesces reads, expires, and invalidates", async () => {
    let now = 0;
    const cache = createCache<number>(30_000, () => now);
    const read = vi.fn().mockResolvedValue(1);
    expect(await Promise.all([cache.get(read), cache.get(read)])).toEqual([
      1, 1,
    ]);
    expect(read).toHaveBeenCalledTimes(1);
    now = 30_001;
    await cache.get(read);
    cache.invalidate();
    await cache.get(read);
    expect(read).toHaveBeenCalledTimes(3);
  });
  it("does not cache failures or let an old read overwrite a newer generation", async () => {
    const cache = createCache<number>(30_000);
    await expect(
      cache.get(() => Promise.reject(new Error("offline"))),
    ).rejects.toThrow();
    let resolve!: (n: number) => void;
    const old = cache.get(
      () =>
        new Promise<number>((r) => {
          resolve = r;
        }),
    );
    cache.invalidate();
    expect(await cache.get(async () => 2)).toBe(2);
    resolve(1);
    await old;
    expect(await cache.get(async () => 3)).toBe(2);
  });
});
it("calculates Haversine distances including identical points", () => {
  expect(distanceKm(30, -96, 30, -96)).toBe(0);
  expect(distanceKm(0, 0, 0, 1)).toBeCloseTo(111.195, 2);
});
it("formats dates without making up a time for historical date-only values", () => {
  expect(relativeTime("2026-09-27", 0)).toBe("Sep 27, 2026");
  expect(
    relativeTime("2026-09-27T10:00:00Z", Date.parse("2026-09-27T12:00:00Z")),
  ).toBe("2 hours ago");
  expect(relativeTime(null, 0)).toBe("Not recorded");
});
it("expires the five-second cooldown and clamps unexpected future timestamps", () => {
  expect(remainingCooldown(5000, 0)).toBe(5);
  expect(remainingCooldown(5000, 4500)).toBe(1);
  expect(remainingCooldown(5000, 5000)).toBe(0);
  expect(remainingCooldown(100_000, 0)).toBe(5);
});
