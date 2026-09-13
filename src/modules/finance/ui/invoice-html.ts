import type { Locale } from "@/src/modules/localization";
import type { InvoiceView } from "../ports/finance-repository";
import { financeText, financeDate, financeMoney } from "./finance-copy";
const escape = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
export function invoiceHtml(invoice: InvoiceView, locale: Locale) {
  const t = financeText(locale),
    party = (side: "payer" | "payee") =>
      `<section><h2>${side === "payer" ? t("Payable by", "გადამხდელი") : t("Payable to", "მიმღები")}</h2>${Object.values(
        invoice[side],
      )
        .filter(Boolean)
        .map((v) => `<p>${escape(v)}</p>`)
        .join("")}</section>`;
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(invoice.number)}</title><style>body{font-family:Manrope,"Noto Sans Georgian",sans-serif;color:#10213d;max-width:900px;margin:40px auto;padding:24px;line-height:1.6}header,.parties{display:flex;justify-content:space-between;gap:32px}section{flex:1;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;margin:32px 0}td,th{padding:12px;text-align:left;border-bottom:1px solid #dce3ee}td:last-child,th:last-child{text-align:right}.total{text-align:right;font-size:24px}small{display:block}@media print{body{margin:0;padding:0}tr{break-inside:avoid}}</style></head><body><header><strong>Xurjin</strong><div><h1>${invoice.total.startsWith("-") ? t("Credit adjustment", "კრედიტის კორექტირება") : t("Invoice", "ინვოისი")}</h1><p>${escape(invoice.number)}</p><p>${escape(financeDate(invoice.issuedAt, locale, true))}</p></div></header><div class="parties">${party("payer")}${party("payee")}</div><table><thead><tr><th>${t("Commission / correction", "საკომისიო / შესწორება")}</th><th>${t("Source reference", "წყაროს მითითება")}</th><th>${t("Amount (GEL)", "თანხა (GEL)")}</th></tr></thead><tbody>${invoice.lines.map((l) => `<tr><td>${escape(l.description)}<small>${escape(financeDate(l.occurredOn, locale))}</small></td><td>${escape(l.orderId)}</td><td>${escape(financeMoney(l.amount, locale))}</td></tr>`).join("")}</tbody></table><div class="total">${t("Invoice total (GEL)", "ინვოისის ჯამი (GEL)")} <strong>${escape(financeMoney(invoice.total, locale))}</strong></div></body></html>`;
}
