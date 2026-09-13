import type { Locale } from "@/src/modules/localization";
import type { InvoiceView, InvoicePreview } from "../ports/finance-repository";
import { financeText, financeDate, financeMoney } from "./finance-copy";
export function InvoiceDocument({
  invoice,
  locale,
}: {
  invoice: InvoiceView | InvoicePreview;
  locale: Locale;
}) {
  const t = financeText(locale);
  return (
    <article className="finance-document" id="invoice-document">
      <header>
        <strong className="finance-wordmark">Xurjin</strong>
        <div>
          <h1>
            {invoice.total.startsWith("-")
              ? t("Credit adjustment", "კრედიტის კორექტირება")
              : t("Invoice", "ინვოისი")}
          </h1>
          <p>
            {"number" in invoice
              ? invoice.number
              : t("Not issued", "არ არის გაცემული")}
          </p>
          {"issuedAt" in invoice && (
            <p>{financeDate(invoice.issuedAt, locale, true)}</p>
          )}
        </div>
      </header>
      <div className="finance-document-parties">
        {(["payer", "payee"] as const).map((side) => (
          <section key={side}>
            <h2>
              {side === "payer"
                ? t("Payable by", "გადამხდელი")
                : t("Payable to", "მიმღები")}
            </h2>
            <strong>{invoice[side].name}</strong>
            {(["identification", "address", "bank", "iban"] as const).map(
              (field) =>
                invoice[side][field] ? (
                  <p key={field}>{invoice[side][field]}</p>
                ) : null,
            )}
          </section>
        ))}
      </div>
      <table>
        <thead>
          <tr>
            <th>{t("Commission / correction", "საკომისიო / შესწორება")}</th>
            <th>{t("Source reference", "წყაროს მითითება")}</th>
            <th>{t("Amount (GEL)", "თანხა (GEL)")}</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((l) => (
            <tr key={l.attributionId}>
              <td>
                {l.description}
                <small>{financeDate(l.occurredOn, locale)}</small>
              </td>
              <td>{l.orderId}</td>
              <td>{financeMoney(l.amount, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!invoice.lines.length && (
        <p className="finance-empty">
          {t("Nothing new to invoice", "ინვოისისთვის ახალი ჩანაწერები არ არის")}
        </p>
      )}
      <div className="finance-document-total">
        <span>{t("Invoice total (GEL)", "ინვოისის ჯამი (GEL)")}</span>
        <strong>{financeMoney(invoice.total, locale)}</strong>
      </div>
      <p className="finance-document-footer">
        {t("Commission statement · GEL", "საკომისიოს დოკუმენტი · GEL")}
      </p>
    </article>
  );
}
