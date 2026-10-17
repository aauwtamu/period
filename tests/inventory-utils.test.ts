import { describe, expect, it, vi } from "vitest";
import { createCache } from "@/lib/utils/cache";
import { distanceKm } from "@/lib/utils/distance";

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
