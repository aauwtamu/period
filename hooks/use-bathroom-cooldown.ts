"use client";
import { useEffect, useRef, useState } from "react";

const PREFIX = "tamuperiod:cooldown:";
export const COOLDOWN_MS = 5000;
export function remainingCooldown(until: number, now: number) {
  return Math.max(0, Math.min(5, Math.ceil((until - now) / 1000)));
}

export function useBathroomCooldown() {
  const deadlines = useRef<Record<string, number>>({});
  const [now, setNow] = useState(0);
  useEffect(() => {
    const load = () => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(PREFIX)) {
            const raw = Number(localStorage.getItem(key));
            deadlines.current[key.slice(PREFIX.length)] = Number.isFinite(raw)
              ? Math.min(raw, Date.now() + COOLDOWN_MS)
              : 0;
          }
        }
      } catch {
        /* In-memory cooldown remains available. */
      }
      setNow(Date.now());
    };
    load();
    window.addEventListener("storage", load);
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => {
      window.removeEventListener("storage", load);
      clearInterval(timer);
    };
  }, []);
  function start(id: string) {
    const until = Date.now() + COOLDOWN_MS;
    deadlines.current[id] = until;
    try {
      localStorage.setItem(PREFIX + id, String(until));
    } catch {
      /* Storage may be disabled. */
    }
    setNow(Date.now());
  }
  return {
    remaining: (id: string) =>
      now ? remainingCooldown(deadlines.current[id] ?? 0, now) : 0,
    start,
  };
}
