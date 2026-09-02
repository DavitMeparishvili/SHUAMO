import { err, ok, type Result } from "@/src/modules/shared";

export type ConversionStatus =
  "PENDING" | "CONFIRMED" | "CANCELLED" | "UNATTRIBUTED";
export type OrderAction = "CONFIRM" | "CANCEL";

export function nextStatus(
  current: ConversionStatus,
  action: OrderAction,
): Result<ConversionStatus, "illegal_transition"> {
  if (current === "PENDING" && action === "CONFIRM") return ok("CONFIRMED");
  if (
    (current === "PENDING" || current === "CONFIRMED") &&
    action === "CANCEL"
  ) {
    return ok("CANCELLED");
  }
  return err("illegal_transition");
}
