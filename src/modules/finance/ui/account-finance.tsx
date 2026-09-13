"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Locale } from "@/src/modules/localization";
import type {
  AccountFinance as Account,
  InvoicePreview,
  PaymentView,
} from "../ports/finance-repository";
import { financeText, financeError, financeMoney } from "./finance-copy";
import { BalanceSummary } from "./finance-summary";
import { FinanceHistories } from "./finance-histories";
import { PaymentForm, type FinanceAction } from "./payment-form";
import { InvoiceForm, type PreviewAction } from "./invoice-form";
export function AccountFinance({
  account,
  locale,
  admin = false,
  requestKey,
  today,
  record,
  reverse,
  issue,
  preview,
}: {
  account: Account;
  locale: Locale;
  admin?: boolean;
  requestKey: string;
  today: string;
  record?: FinanceAction;
  reverse?: FinanceAction;
  issue?: FinanceAction;
  preview?: PreviewAction;
}) {
  const t = financeText(locale),
    router = useRouter(),
    dialog = useRef<HTMLDialogElement>(null),
    reverseDialog = useRef<HTMLDialogElement>(null);
  const [key, setKey] = useState(requestKey),
    [invoice, setInvoice] = useState<InvoicePreview | null>(null),
    [reversing, setReversing] = useState<PaymentView | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState("");
  const basePath = `/${locale}/${admin ? `admin/finance/${account.party.kind}/${account.party.id}` : `${account.party.kind}/finance`}`;
  const paymentLabel =
    account.party.kind === "brand"
      ? t("Record payment received", "მიღებული გადახდის აღრიცხვა")
      : t("Record payout made", "გაცემული გადახდის აღრიცხვა");
  return (
    <div className="finance-surface workspace-content">
      <header className="finance-heading">
        <div>
          {admin && (
            <Link
              href={`/${locale}/admin/finance?tab=${account.party.kind === "brand" ? "brands" : "creators"}`}
            >
              {t("Finance", "ფინანსები")} / {t("Accounts", "ანგარიშები")}
            </Link>
          )}
          <h1>{admin ? account.name : t("Your money", "თქვენი ფინანსები")}</h1>
          <p>
            {account.name} ·{" "}
            {account.party.kind === "brand"
              ? t("Brand account", "ბრენდის ანგარიში")
              : t("Creator account", "კრეატორის ანგარიში")}{" "}
            · {t("All time", "მთელი პერიოდი")}
          </p>
        </div>
        {admin && !invoice && (
          <div className="finance-actions">
            <button
              className="finance-button"
              disabled={pending}
              onClick={async () => {
                if (!preview) return;
                setPending(true);
                setError("");
                setKey(crypto.randomUUID());
                try {
                  const result = await preview(account.party);
                  if (result.ok) setInvoice(result.value);
                  else setError(financeError(result.error, locale));
                } catch {
                  setError(financeError("network", locale));
                } finally {
                  setPending(false);
                }
              }}
            >
              {t("Generate invoice", "ინვოისის შექმნა")}
            </button>
            <button
              className="finance-button finance-primary"
              onClick={() => {
                setKey(crypto.randomUUID());
                dialog.current?.showModal();
              }}
            >
              {paymentLabel}
            </button>
          </div>
        )}
        {invoice && (
          <button className="finance-button" onClick={() => setInvoice(null)}>
            {t("Back to account", "ანგარიშზე დაბრუნება")}
          </button>
        )}
      </header>
      {error && (
        <p role="alert" className="finance-error">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="finance-note">
          {t("Payment record saved", "გადახდის ჩანაწერი შენახულია")} ·{" "}
          <Link href={`${basePath}?record=${saved}#payment-${saved}`}>
            {t("View record", "ჩანაწერის ნახვა")}
          </Link>
        </p>
      )}
      {invoice && issue && preview ? (
        <InvoiceForm
          key={key}
          initial={invoice}
          requestKey={key}
          locale={locale}
          submit={issue}
          refresh={preview}
          onSuccess={(id) => router.push(`/${locale}/finance/invoices/${id}`)}
        />
      ) : (
        <>
          <BalanceSummary account={account} locale={locale} />
          <p className="finance-scope">
            {t(
              "Balances reflect confirmed commissions and admin-recorded transfers. Invoices do not change balances.",
              "ბალანსი ასახავს დადასტურებულ საკომისიოს და ადმინისტრატორის მიერ აღრიცხულ გადარიცხვებს. ინვოისები ბალანსს არ ცვლის.",
            )}
          </p>
          <FinanceHistories
            account={account}
            locale={locale}
            basePath={basePath}
            admin={admin}
            {...(admin
              ? {
                  actions: (p: PaymentView) =>
                    p.kind === "PAYMENT" && !p.reversed ? (
                      <button
                        className="finance-button"
                        onClick={() => {
                          setReversing(p);
                          setKey(crypto.randomUUID());
                          setError("");
                          reverseDialog.current?.showModal();
                        }}
                      >
                        {t(
                          "Reverse payment record",
                          "გადახდის ჩანაწერის გაუქმება",
                        )}
                      </button>
                    ) : null,
                }
              : {})}
          />
        </>
      )}
      {admin && record && (
        <dialog
          className="finance-drawer"
          ref={dialog}
          aria-labelledby="payment-form-title"
        >
          <header>
            <h2 id="payment-form-title">{paymentLabel}</h2>
            <button
              className="finance-button"
              onClick={() => dialog.current?.close()}
            >
              {t("Close", "დახურვა")}
            </button>
          </header>
          <PaymentForm
            key={key}
            account={account}
            locale={locale}
            requestKey={key}
            today={today}
            submit={record}
            onSuccess={(id) => {
              dialog.current?.close();
              setSaved(id);
              router.refresh();
            }}
          />
        </dialog>
      )}
      {admin && reverse && (
        <dialog
          className="finance-reversal-dialog"
          ref={reverseDialog}
          aria-labelledby="reversal-title"
        >
          <form
            className="finance-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!reversing) return;
              const data = new FormData(e.currentTarget);
              setPending(true);
              setError("");
              try {
                const result = await reverse({
                  requestKey: key,
                  paymentId: reversing.id,
                  reason: data.get("reason"),
                });
                if (result.ok) {
                  reverseDialog.current?.close();
                  setSaved(result.value.id);
                  router.refresh();
                } else setError(financeError(result.error, locale));
              } catch {
                setError(financeError("network", locale));
              } finally {
                setPending(false);
              }
            }}
          >
            <h2 id="reversal-title">
              {t("Reverse payment record", "გადახდის ჩანაწერის გაუქმება")}
            </h2>
            <p>
              {reversing?.name} ·{" "}
              {reversing && financeMoney(reversing.amount, locale)}
            </p>
            <p>
              {t(
                "This corrects the Xurjin record. It does not send or recover money.",
                "ეს ასწორებს Xurjin-ის ჩანაწერს. თანხა არ იგზავნება და არ ბრუნდება.",
              )}
            </p>
            <label htmlFor="reverse-reason">
              {t("Correction reason", "შესწორების მიზეზი")}
            </label>
            <textarea
              key={key}
              id="reverse-reason"
              name="reason"
              required
              maxLength={1000}
            />
            {error && (
              <p role="alert" className="finance-error">
                {error}
              </p>
            )}
            <div className="finance-actions">
              <button
                className="finance-button"
                type="button"
                onClick={() => reverseDialog.current?.close()}
              >
                {t("Cancel", "გაუქმება")}
              </button>
              <button
                className="finance-button finance-primary"
                disabled={pending}
              >
                {t("Reverse record", "ჩანაწერის გაუქმება")}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
