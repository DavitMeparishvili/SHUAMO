import type { DocumentParty } from "../domain/finance";
export function platformDocument(): DocumentParty {
  return {
    name: process.env.FINANCE_PLATFORM_NAME || "Xurjin",
    identification: process.env.FINANCE_PLATFORM_IDENTIFICATION || "",
    address: process.env.FINANCE_PLATFORM_ADDRESS || "",
    bank: process.env.FINANCE_PLATFORM_BANK || "",
    iban: process.env.FINANCE_PLATFORM_IBAN || "",
  };
}
