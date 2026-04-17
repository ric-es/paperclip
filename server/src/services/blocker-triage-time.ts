const BLOCKER_TRIAGE_PT_HOUR = 8;
const PT_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const PT_HOUR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  hour: "numeric",
  hour12: false,
});

export function ptDateString(now: Date): string {
  return PT_DATE_FORMATTER.format(now);
}

export function ptHour(now: Date): number {
  const formatted = PT_HOUR_FORMATTER.format(now);
  const parsed = Number.parseInt(formatted, 10);
  if (Number.isNaN(parsed)) return -1;
  // Some Intl backends return "24" for midnight; normalize.
  return parsed === 24 ? 0 : parsed;
}

export function shouldRunBlockerTriageSweep(
  now: Date,
  lastSweepPtDate: string | null,
): boolean {
  if (ptHour(now) < BLOCKER_TRIAGE_PT_HOUR) return false;
  return ptDateString(now) !== lastSweepPtDate;
}
