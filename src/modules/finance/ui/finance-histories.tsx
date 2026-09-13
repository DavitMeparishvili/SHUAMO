import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/src/modules/localization";
import type {
  AccountFinance,
  PaymentView,
  Page,
} from "../ports/finance-repository";
import { financeText, financeMoney, financeDate } from "./finance-copy";
export function FinancePagination({
  data,
  basePath,
  parameter = "page",
  params = {},
  locale,
}: {
  data: Pick<Page<unknown>, "page" | "pageSize" | "total">;
  basePath: string;
  parameter?: string;
  params?: Record<string, string>;
  locale: Locale;
}) {
  const t = financeText(locale),
    pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const href = (page: number) =>
    `${basePath}?${new URLSearchParams({ ...params, [parameter]: String(page) })}`;
  return (
    <nav
      className="finance-pagination"
      aria-label={`${parameter} ${t("pagination", "გვერდები")}`}
    >
      <span>
        {t("Page", "გვერდი")} {data.page} / {pages} · {data.total}{" "}
        {t("records", "ჩანაწერი")}
      </span>
      <div>
        {data.page > 1 && (
          <Link href={href(data.page - 1)} scroll={false}>
            {t("Previous", "წინა")}
          </Link>
        )}
        {data.page < pages && (
          <Link href={href(data.page + 1)} scroll={false}>
            {t("Next", "შემდეგი")}
          </Link>
        )}
      </div>
    </nav>
  );
}
export function PaymentHistory({
  payments,
  locale,
  admin = false,
  actions,
}: {
  payments: PaymentView[];
  locale: Locale;
  admin?: boolean;
  actions?: (payment: PaymentView) => ReactNode;
}) {
  const t = financeText(locale);
  return (
    <div className="finance-records">
      {payments.length ? (
        payments.map((p) => (
          <details id={`payment-${p.id}`} className="finance-record" key={p.id}>
            <summary>
              <span>
                <strong>
                  {p.kind === "REVERSAL"
                    ? t(
                        "Payment record reversed",
                        "გადახდის ჩანაწერი გაუქმებულია",
                      )
                    : p.party.kind === "brand"
                      ? t("Payment received", "მიღებული გადახდა")
                      : t("Payout recorded", "აღრიცხული გადახდა")}
                </strong>
                <small>
                  {admin ? `${p.name} · ` : ""}
                  {financeDate(p.transferredOn, locale)} ·{" "}
                  {t("Transfer date", "გადარიცხვის თარიღი")}
                </small>
                {p.reversed && (
                  <span className="finance-badge">
                    {t("Reversed", "გაუქმებულია")}
                  </span>
                )}
              </span>
              <strong>{financeMoney(p.amount, locale)}</strong>
            </summary>
            <dl className="finance-details">
              <div>
                <dt>{t("Record ID", "ჩანაწერის ID")}</dt>
                <dd>{p.id}</dd>
              </div>
              <div>
                <dt>{t("Direction", "მიმართულება")}</dt>
                <dd>
                  {p.kind === "REVERSAL"
                    ? t("Record correction", "ჩანაწერის შესწორება")
                    : p.party.kind === "brand"
                      ? `${p.name} → Xurjin`
                      : `Xurjin → ${p.name}`}
                </dd>
              </div>
              <div>
                <dt>{t("Recorded at", "აღრიცხვის დრო")}</dt>
                <dd>
                  {financeDate(p.recordedAt, locale, true)} · {p.recordedBy}
                </dd>
              </div>
              <div>
                <dt>{t("Bank reference", "ბანკის მითითება")}</dt>
                <dd>{p.bankReference || "—"}</dd>
              </div>
              <div>
                <dt>
                  {p.kind === "REVERSAL"
                    ? t("Correction reason", "შესწორების მიზეზი")
                    : t("Note", "შენიშვნა")}
                </dt>
                <dd>{p.note || "—"}</dd>
              </div>
              {p.invoiceId && (
                <div>
                  <dt>{t("Related invoice", "დაკავშირებული ინვოისი")}</dt>
                  <dd>
                    <Link href={`/${locale}/finance/invoices/${p.invoiceId}`}>
                      {t("View invoice", "ინვოისის ნახვა")}
                    </Link>
                  </dd>
                </div>
              )}
              {p.reversesId && (
                <div>
                  <dt>{t("Original record", "საწყისი ჩანაწერი")}</dt>
                  <dd>
                    <Link
                      href={`/${locale}/${admin ? `admin/finance/${p.party.kind}/${p.party.id}` : `${p.party.kind}/finance`}?record=${p.reversesId}#payment-${p.reversesId}`}
                    >
                      {p.reversesId}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
            {actions?.(p)}
          </details>
        ))
      ) : (
        <p className="finance-empty">
          {t("No payments recorded yet", "გადახდები ჯერ არ არის აღრიცხული")}
        </p>
      )}
    </div>
  );
}
export function FinanceHistories({
  account,
  locale,
  basePath,
  compact = false,
  admin = false,
  actions,
}: {
  account: AccountFinance;
  locale: Locale;
  basePath: string;
  compact?: boolean;
  admin?: boolean;
  actions?: (payment: PaymentView) => ReactNode;
}) {
  const t = financeText(locale);
  return (
    <div className="finance-histories">
      <section className="finance-panel">
        <header className="finance-heading">
          <h2>{t("Transactions", "ტრანზაქციები")}</h2>
          {compact && (
            <Link href={basePath}>{t("View all", "ყველას ნახვა")}</Link>
          )}
        </header>
        <PaymentHistory
          payments={account.payments.items}
          locale={locale}
          admin={admin}
          {...(actions ? { actions } : {})}
        />
        {!compact && (
          <FinancePagination
            locale={locale}
            data={account.payments}
            basePath={basePath}
            params={{ invoicePage: String(account.invoices.page) }}
          />
        )}
      </section>
      <section className="finance-panel">
        <header className="finance-heading">
          <h2>{t("Invoices", "ინვოისები")}</h2>
          {compact && (
            <Link href={`${basePath}#invoices`}>
              {t("View all", "ყველას ნახვა")}
            </Link>
          )}
        </header>
        <div id="invoices">
          {account.invoices.items.length ? (
            account.invoices.items.map((i) => (
              <Link
                key={i.id}
                className="finance-invoice-row"
                href={`/${locale}/finance/invoices/${i.id}`}
              >
                <span>
                  <strong>{i.number}</strong>
                  <small>
                    {financeDate(i.issuedAt, locale)} · {i.payer.name} →{" "}
                    {i.payee.name}
                  </small>
                </span>
                <strong>{financeMoney(i.total, locale)}</strong>
              </Link>
            ))
          ) : (
            <p className="finance-empty">
              {t("No invoices yet", "ინვოისები ჯერ არ არის")}
            </p>
          )}
        </div>
        {!compact && (
          <FinancePagination
            locale={locale}
            data={account.invoices}
            basePath={basePath}
            parameter="invoicePage"
            params={{ page: String(account.payments.page) }}
          />
        )}
      </section>
    </div>
  );
}
