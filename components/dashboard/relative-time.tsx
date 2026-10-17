import { relativeTime } from "@/lib/utils/dates";
export function RelativeTime({
  value,
  now,
}: {
  value: string | null;
  now: number;
}) {
  return (
    <time dateTime={value ?? undefined} title={value ?? "No update recorded"}>
      {relativeTime(value, now)}
    </time>
  );
}
