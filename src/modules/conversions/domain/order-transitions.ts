import { err, ok, type Result } from "@/src/modules/shared";

export type ConversionStatus = "CONFIRMED" | "CANCELLED";
export type OrderAction = "CANCEL";

export function nextStatus(
  current: ConversionStatus,
  action: OrderAction,
): Result<ConversionStatus, "illegal_transition"> {
  if (current === "CONFIRMED" && action === "CANCEL") {
    return ok("CANCELLED");
  }
  return err("illegal_transition");
}
