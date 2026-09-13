import Decimal from "decimal.js";
export function paymentAmount(value: string): string {
  const text = value.trim();
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(text))
    throw new RangeError("invalid_input");
  const amount = new Decimal(text);
  if (amount.lte(0) || amount.gt("9999999999.99"))
    throw new RangeError("invalid_input");
  return amount.toFixed(2);
}
export function transferDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-"))
    throw new RangeError("invalid_input");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new RangeError("invalid_input");
  return value;
}
export function tbilisiToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
