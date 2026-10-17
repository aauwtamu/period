export function relativeTime(value: string | null, now: number) {
  if (!value) return "Not recorded";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value));
  }
  const elapsed = Math.max(0, now - Date.parse(value));
  if (!Number.isFinite(elapsed)) return "Not recorded";
  if (elapsed < 60_000) return "Just now";
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (elapsed < 3_600_000)
    return formatter.format(-Math.floor(elapsed / 60_000), "minute");
  if (elapsed < 86_400_000)
    return formatter.format(-Math.floor(elapsed / 3_600_000), "hour");
  return formatter.format(-Math.floor(elapsed / 86_400_000), "day");
}
