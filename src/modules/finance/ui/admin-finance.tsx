import Link from "next/link";
import { DataTable } from "@/src/modules/design-system";
import { WorkspaceShell } from "@/src/modules/identity";
import type { Locale } from "@/src/modules/localization";
import type {
  AccountRow,
  Page,
  PaymentView,
} from "../ports/finance-repository";
import { financeText, financeMoney } from "./finance-copy";
import { FinancePagination, PaymentHistory } from "./finance-histories";
export function AdminFinance({
  locale,
  tab,
  q,
  accounts,
  transactions,
}: {
  locale: Locale;
  tab: string;
  q: string;
  accounts?: Page<AccountRow>;
  transactions?: Page<PaymentView>;
}) {
  const t = financeText(locale),
    basePath = `/${locale}/admin/finance`,
    brand = tab === "brands";
  const balance = (r: AccountRow) => (
    <span
      className={r.balance.outstanding.startsWith("-") ? "finance-credit" : ""}
    >
      <strong>
        {financeMoney(r.balance.outstanding.replace(/^-/, ""), locale)}
      </strong>
      <small>
        {r.balance.outstanding.startsWith("-")
          ? brand
            ? t("Credit", "კრედიტი")
            : t(
                "Paid above current earnings",
                "მიმდინარე შემოსავალზე მეტი გადახდა",
              )
          : r.balance.outstanding === "0.00"
            ? t("Balanced", "დაფარულია")
            : brand
              ? t("Outstanding", "დარჩენილი")
              : t("Unpaid", "გადაუხდელი")}
      </small>
    </span>
  );
  const link = (r: AccountRow) => `${basePath}/${r.party.kind}/${r.party.id}`;
  const obligation = brand
      ? t("Commission obligation", "საკომისიოს ვალდებულება")
      : t("Earned commission", "გამომუშავებული საკომისიო"),
    paid = brand
      ? t("Payments received", "მიღებული გადახდები")
      : t("Paid to creator", "კრეატორისთვის გადახდილი");
  return (
    <div className="finance-surface">
      <WorkspaceShell
        name=""
        showName={false}
        contentVariant="plain"
        title={t("Finance", "ფინანსები")}
        intro={t(
          "Manage balances, invoices and recorded payments.",
          "მართეთ ბალანსები, ინვოისები და აღრიცხული გადახდები.",
        )}
      >
        <p className="finance-note">
          {t(
            "External transfers are recorded manually.",
            "გარე გადარიცხვები აღირიცხება ხელით.",
          )}
        </p>
        <nav
          className="finance-tabs"
          aria-label={t("Finance views", "ფინანსების ხედები")}
        >
          {[
            ["brands", t("Brands", "ბრენდები")],
            ["creators", t("Creators", "კრეატორები")],
            ["transactions", t("Transactions", "ტრანზაქციები")],
          ].map(([key, label]) => (
            <Link
              key={key}
              aria-current={key === tab ? "page" : undefined}
              href={`${basePath}?tab=${key}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <form className="finance-search">
          <input type="hidden" name="tab" value={tab} />
          <label htmlFor="finance-search" className="sr-only">
            {t("Search accounts or references", "ანგარიშის ან მითითების ძიება")}
          </label>
          <input
            id="finance-search"
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t(
              "Search accounts or references",
              "ანგარიშის ან მითითების ძიება",
            )}
            maxLength={120}
          />
          <button className="finance-button">{t("Search", "ძიება")}</button>
        </form>
        {accounts && (
          <section className="finance-panel">
            <h2>
              {t(
                "Current balances · All time",
                "მიმდინარე ბალანსები · მთელი პერიოდი",
              )}
            </h2>
            <p>
              {t(
                "Invoices do not change account balances.",
                "ინვოისები ანგარიშის ბალანსს არ ცვლის.",
              )}
            </p>
            <div className="finance-desktop-table">
              <DataTable
                caption={t("Account balances", "ანგარიშების ბალანსები")}
                rowKey="id"
                columns={[
                  { key: "name", label: t("Account", "ანგარიში") },
                  { key: "earned", label: obligation, align: "right" },
                  { key: "paid", label: paid, align: "right" },
                  {
                    key: "balance",
                    label: t("Balance", "ბალანსი"),
                    align: "right",
                  },
                  { key: "action", label: t("Actions", "მოქმედებები") },
                ]}
                rows={accounts.items.map((r) => ({
                  id: r.party.id,
                  name: <Link href={link(r)}>{r.name}</Link>,
                  earned: financeMoney(r.balance.earned, locale),
                  paid: financeMoney(r.balance.payments, locale),
                  balance: balance(r),
                  action: (
                    <Link className="finance-button" href={link(r)}>
                      {t("Open account", "ანგარიშის გახსნა")}
                    </Link>
                  ),
                }))}
              />
            </div>
            <div className="finance-mobile-cards">
              {accounts.items.map((r) => (
                <article key={r.party.id}>
                  <h3>
                    <Link href={link(r)}>{r.name}</Link>
                  </h3>
                  <dl>
                    <div>
                      <dt>{t("Balance", "ბალანსი")}</dt>
                      <dd>{balance(r)}</dd>
                    </div>
                    <div>
                      <dt>{obligation}</dt>
                      <dd>{financeMoney(r.balance.earned, locale)}</dd>
                    </div>
                    <div>
                      <dt>{paid}</dt>
                      <dd>{financeMoney(r.balance.payments, locale)}</dd>
                    </div>
                  </dl>
                  <Link className="finance-button" href={link(r)}>
                    {t("Open account", "ანგარიშის გახსნა")}
                  </Link>
                </article>
              ))}
            </div>
            {!accounts.items.length && (
              <p className="finance-empty">
                {t(
                  "No matching accounts",
                  "შესაბამისი ანგარიშები ვერ მოიძებნა",
                )}
              </p>
            )}
            <FinancePagination
              data={accounts}
              basePath={basePath}
              params={{ tab, q }}
              locale={locale}
            />
          </section>
        )}
        {transactions && (
          <section className="finance-panel">
            <h2>
              {t(
                "Recorded transfers and corrections",
                "აღრიცხული გადარიცხვები და შესწორებები",
              )}
            </h2>
            <PaymentHistory
              payments={transactions.items}
              locale={locale}
              admin
            />
            <FinancePagination
              data={transactions}
              basePath={basePath}
              params={{ tab, q }}
              locale={locale}
            />
          </section>
        )}
      </WorkspaceShell>
    </div>
  );
}
