"use client";
import type { Locale } from "@/src/modules/localization";
import { financeText } from "./finance-copy";
export function PrintInvoiceButton({ locale }: { locale: Locale }) {
  const t = financeText(locale);
  return (
    <button
      type="button"
      className="finance-button"
      onClick={() => window.print()}
    >
      {t("Print / Save as PDF", "ბეჭდვა / PDF-ად შენახვა")}
    </button>
  );
}
