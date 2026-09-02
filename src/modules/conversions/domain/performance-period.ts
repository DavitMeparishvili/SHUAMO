export const PERFORMANCE_PERIODS = [
  "7d",
  "30d",
  "90d",
  "custom",
  "all",
] as const;

export type PerformancePeriod = (typeof PERFORMANCE_PERIODS)[number];

export function performancePeriod(
  value: string | undefined,
): PerformancePeriod {
  return PERFORMANCE_PERIODS.includes(value as PerformancePeriod)
    ? (value as PerformancePeriod)
    : "30d";
}

export function performancePeriodStart(
  period: PerformancePeriod,
  now: Date,
  customStart?: Date,
): Date | undefined {
  if (period === "all") return undefined;
  if (period === "custom") return customStart;
  const days = Number.parseInt(period, 10);
  const georgiaDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const start = new Date(`${georgiaDay}T00:00:00.000+04:00`);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start;
}

export function performanceTrendStart(
  period: PerformancePeriod,
  now: Date,
  customStart?: Date,
): Date {
  const requested =
    performancePeriodStart(period, now, customStart) ??
    performancePeriodStart("90d", now)!;
  const floor = performancePeriodStart("90d", now)!;
  return requested < floor ? floor : requested;
}
