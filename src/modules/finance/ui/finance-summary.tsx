import Link from "next/link";
import type { Locale } from "@/src/modules/localization";
import type { AccountFinance } from "../ports/finance-repository";
import { financeText, financeMoney } from "./finance-copy";
import { FinanceHistories } from "./finance-histories";
export function BalanceSummary({
  account,
  locale,
}: {
  account: Pick<AccountFinance, "party" | "balance">;
  locale: Locale;
}) {
  const t = financeText(locale),
    brand = account.party.kind === "brand",
    credit = account.balance.outstanding.startsWith("-");
  return (
    <div className="finance-metrics" data-testid="finance-balance">
      <div
        className={`finance-metric finance-remaining ${credit ? "finance-credit" : ""}`}
      >
        <span>
          {credit
            ? brand
              ? t("Credit", "კრედიტი")
              : t(
                  "Paid above current earnings",
                  "მიმდინარე შემოსავალზე მეტი გადახდა",
                )
            : brand
              ? t("Amount outstanding", "დარჩენილი გადასახდელი")
              : t("Unpaid earnings", "გადაუხდელი შემოსავალი")}
        </span>
        <strong data-amount={account.balance.outstanding}>
          {financeMoney(account.balance.outstanding.replace(/^-/, ""), locale)}
        </strong>
        <small>{t("All time", "მთელი პერიოდი")}</small>
      </div>
      <div className="finance-metric">
        <span>
          {brand
            ? t("Commission obligation", "საკომისიოს ვალდებულება")
            : t("Earned commission", "გამომუშავებული საკომისიო")}
        </span>
        <strong>{financeMoney(account.balance.earned, locale)}</strong>
        <small>
          {t(
            "Confirmed commissions · All time",
            "დადასტურებული საკომისიო · მთელი პერიოდი",
          )}
        </small>
      </div>
      <div className="finance-metric">
        <span>
          {brand
            ? t("Payments received", "მიღებული გადახდები")
            : t("Paid to you", "თქვენთვის გადახდილი")}
        </span>
        <strong>{financeMoney(account.balance.payments, locale)}</strong>
        <small>
          {brand
            ? t(
                "Received by Xurjin · Admin-recorded",
                "Xurjin-ის მიერ მიღებული · ადმინისტრატორის ჩანაწერები",
              )
            : t(
                "Admin-recorded payouts",
                "ადმინისტრატორის მიერ აღრიცხული გადახდები",
              )}
        </small>
      </div>
    </div>
  );
}
export function FinanceSummary({
  account,
  locale,
}: {
  account: AccountFinance;
  locale: Locale;
}) {
  const t = financeText(locale),
    href = `/${locale}/${account.party.kind}/finance`;
  return (
    <section className="finance-home finance-surface">
      <header className="finance-heading">
        <div>
          <h2>{t("Your money", "თქვენი ფინანსები")}</h2>
          <p>
            {t(
              "All-time balances and recorded transfers",
              "მთელი პერიოდის ბალანსი და აღრიცხული გადარიცხვები",
            )}
          </p>
        </div>
        <Link href={href}>
          {t("View all finance", "ყველა ფინანსური ჩანაწერი")}
        </Link>
      </header>
      <BalanceSummary account={account} locale={locale} />
      <FinanceHistories
        account={account}
        locale={locale}
        basePath={href}
        compact
      />
    </section>
  );
}
