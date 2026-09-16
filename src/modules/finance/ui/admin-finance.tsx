import Link from "next/link";
import { DataTable } from "@/src/modules/design-system";
import { WorkspaceShell } from "@/src/modules/identity";
import {
  getMessages,
  t as translate,
  type Locale,
} from "@/src/modules/localization";
import type {
  AdminAccountRow,
  Page,
  PaymentView,
} from "../ports/finance-repository";
import { financeText, financeMoney } from "./finance-copy";
import { FinancePagination, PaymentHistory } from "./finance-histories";
import { AccountStatusControl } from "./account-status-control";
import { accountStatusCopy } from "./account-status-copy";
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
  accounts?: Page<AdminAccountRow>;
  transactions?: Page<PaymentView>;
}) {
  const t = financeText(locale),
    basePath = `/${locale}/admin/finance`,
    brand = tab === "brands";
  const messages = getMessages(locale);
  const statusCopy = accountStatusCopy(messages);
  const message = (key: string) => translate(messages, key);
  const namedMessage = (key: string, name: string) =>
    message(key).replace("{name}", name);
  const balance = (r: AdminAccountRow) => (
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
  const link = (r: AdminAccountRow) =>
    `${basePath}/${r.party.kind}/${r.party.id}`;
  const profileLink = (r: AdminAccountRow) =>
    `/${locale}/admin/profiles/${r.party.kind}/${r.party.id}`;
  const profileLabel = (r: AdminAccountRow) =>
    r.profileStatus === "PUBLISHED"
      ? message("admin.accounts.profile.published")
      : r.profileStatus === "DRAFT"
        ? message("admin.accounts.profile.draft")
        : message("admin.accounts.profile.none");
  const profile = (r: AdminAccountRow) => (
    <div className="finance-profile-cell">
      <span>{profileLabel(r)}</span>
      <Link href={profileLink(r)}>
        {message("admin.accounts.list.reviewProfile")}
        <span aria-hidden="true"> →</span>
      </Link>
    </div>
  );
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
          <section className="finance-panel finance-accounts-panel">
            <p className="finance-result-count">
              {message(
                brand
                  ? "admin.accounts.list.brandCount"
                  : "admin.accounts.list.creatorCount",
              ).replace("{count}", String(accounts.total))}
            </p>
            <h2>
              {message(
                brand
                  ? "admin.accounts.list.brandTitle"
                  : "admin.accounts.list.creatorTitle",
              )}
            </h2>
            <p>{message("admin.accounts.list.intro")}</p>
            <div className="finance-desktop-table">
              <DataTable
                caption={message("admin.accounts.list.caption")}
                rowKey="id"
                columns={[
                  {
                    key: "name",
                    label: message("admin.accounts.list.account"),
                  },
                  {
                    key: "profile",
                    label: message("admin.accounts.list.profile"),
                  },
                  {
                    key: "access",
                    label: message("admin.accounts.list.workspaceAccess"),
                  },
                  { key: "earned", label: obligation, align: "right" },
                  { key: "paid", label: paid, align: "right" },
                  {
                    key: "balance",
                    label: message("admin.accounts.list.balance"),
                    align: "right",
                  },
                  {
                    key: "finance",
                    label: message("admin.accounts.list.finance"),
                  },
                ]}
                rows={accounts.items.map((r) => ({
                  id: r.party.id,
                  name: (
                    <div className="finance-account-identity">
                      <Link href={profileLink(r)}>{r.name}</Link>
                      <span>{r.email}</span>
                      <span>
                        {r.phone ?? message("admin.accounts.list.noPhone")}
                      </span>
                    </div>
                  ),
                  profile: profile(r),
                  access: (
                    <AccountStatusControl
                      kind={r.party.kind}
                      id={r.party.id}
                      name={r.name}
                      initialStatus={r.status}
                      copy={statusCopy}
                    />
                  ),
                  earned: financeMoney(r.balance.earned, locale),
                  paid: financeMoney(r.balance.payments, locale),
                  balance: balance(r),
                  finance: (
                    <Link
                      className="finance-button finance-open-link"
                      href={link(r)}
                      aria-label={namedMessage(
                        "admin.accounts.list.openFinanceAria",
                        r.name,
                      )}
                    >
                      {message("admin.accounts.list.openFinance")}
                    </Link>
                  ),
                }))}
              />
            </div>
            <div className="finance-mobile-cards">
              {accounts.items.map((r) => (
                <article key={r.party.id}>
                  <header className="finance-account-card-header">
                    <div>
                      <h3>
                        <Link href={profileLink(r)}>{r.name}</Link>
                      </h3>
                      <span>{r.email}</span>
                      <span>
                        {r.phone ?? message("admin.accounts.list.noPhone")}
                      </span>
                    </div>
                  </header>
                  {profile(r)}
                  <dl>
                    <div>
                      <dt>{message("admin.accounts.list.balance")}</dt>
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
                  <div className="finance-mobile-actions">
                    <Link
                      className="finance-button finance-open-link"
                      href={link(r)}
                      aria-label={namedMessage(
                        "admin.accounts.list.openFinanceAria",
                        r.name,
                      )}
                    >
                      {message("admin.accounts.list.openFinance")}
                    </Link>
                    <AccountStatusControl
                      kind={r.party.kind}
                      id={r.party.id}
                      name={r.name}
                      initialStatus={r.status}
                      copy={statusCopy}
                    />
                  </div>
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
