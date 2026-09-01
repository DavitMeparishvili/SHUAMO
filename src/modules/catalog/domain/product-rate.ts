import { Rate, type Result } from "@/src/modules/shared";

export type RateError =
  | "invalid_number"
  | "negative_value"
  | "too_many_decimal_places"
  | "percent_must_be_a_fraction"
  | "value_too_large";

const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;

export function parseProductRate(input: {
  type: "PERCENT" | "FIXED";
  value: string;
}): Result<Rate, RateError> {
  const value = input.value.trim();
  if (!DECIMAL_PATTERN.test(value))
    return { ok: false, error: "invalid_number" };
  if (value.startsWith("-")) return { ok: false, error: "negative_value" };
  const decimalPlaces = value.split(".")[1]?.length ?? 0;
  if (decimalPlaces > 4) return { ok: false, error: "too_many_decimal_places" };
  if (input.type === "PERCENT" && Number(value) > 1) {
    return { ok: false, error: "percent_must_be_a_fraction" };
  }

  try {
    return {
      ok: true,
      value: input.type === "PERCENT" ? Rate.percent(value) : Rate.fixed(value),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof RangeError && error.message.includes("numeric")
          ? "value_too_large"
          : "invalid_number",
    };
  }
}
