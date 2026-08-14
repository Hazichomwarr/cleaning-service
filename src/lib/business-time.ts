export const BUSINESS_TIME_ZONE = "America/New_York";

type LocalParts = { year: number; month: number; day: number; hour: number; minute: number };

function localParts(value: Date): LocalParts {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TIME_ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(value);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return { year: values.year, month: values.month, day: values.day, hour: values.hour, minute: values.minute };
}

function sameParts(left: LocalParts, right: LocalParts): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day && left.hour === right.hour && left.minute === right.minute;
}

function offsetAt(value: Date): number {
  const parts = localParts(value);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - value.getTime();
}

export function parseBusinessDateTime(date: string, time: string): { date: Date } | { error: "INVALID_LOCAL_TIME" } {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return { error: "INVALID_LOCAL_TIME" };
  const desired: LocalParts = { year: Number(dateMatch[1]), month: Number(dateMatch[2]), day: Number(dateMatch[3]), hour: Number(timeMatch[1]), minute: Number(timeMatch[2]) };
  if (desired.month < 1 || desired.month > 12 || desired.day < 1 || desired.hour > 23 || desired.minute > 59) return { error: "INVALID_LOCAL_TIME" };
  const localAsUtc = new Date(Date.UTC(desired.year, desired.month - 1, desired.day, desired.hour, desired.minute));
  if (localAsUtc.getUTCFullYear() !== desired.year || localAsUtc.getUTCMonth() + 1 !== desired.month || localAsUtc.getUTCDate() !== desired.day) return { error: "INVALID_LOCAL_TIME" };
  const candidates = new Set<number>();
  for (let hours = -72; hours <= 72; hours += 6) candidates.add(offsetAt(new Date(localAsUtc.getTime() + hours * 60 * 60 * 1000)));
  const matches = [...candidates].map((offset) => new Date(localAsUtc.getTime() - offset)).filter((candidate) => sameParts(localParts(candidate), desired));
  return matches.length === 1 ? { date: matches[0] } : { error: "INVALID_LOCAL_TIME" };
}

export function formatBusinessDateTimeRange(start: string | null, end: string | null): string {
  if (!start || !end) return "Incomplete schedule";
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: BUSINESS_TIME_ZONE });
  const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: BUSINESS_TIME_ZONE });
  return `${formatter.format(new Date(start))} · ${timeFormatter.format(new Date(start))}–${timeFormatter.format(new Date(end))}`;
}
