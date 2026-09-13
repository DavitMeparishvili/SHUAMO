import Decimal from "decimal.js";
import type { FinanceBalance } from "./finance";
export function financeBalance(
  earned: string,
  paid: string,
  reversed = "0",
): FinanceBalance {
  const payments = new Decimal(paid).minus(reversed);
  return {
    earned: new Decimal(earned).toFixed(2),
    payments: payments.toFixed(2),
    outstanding: new Decimal(earned).minus(payments).toFixed(2),
  };
}
