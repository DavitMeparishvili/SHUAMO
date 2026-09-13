"use client";
import { useState } from "react";
import Decimal from "decimal.js";
import { Button, Field } from "@/src/modules/design-system";
import type { Locale } from "@/src/modules/localization";
import type { Result } from "@/src/modules/shared";
import type { FinanceError } from "../domain/finance";
import type { AccountFinance } from "../ports/finance-repository";
import { financeText, financeMoney, financeError } from "./finance-copy";
export type FinanceAction = (
  input: unknown,
) => Promise<Result<{ id: string }, FinanceError>>;
export function PaymentForm({
  account,
  locale,
  requestKey,
  today,
  submit,
  onSuccess,
}: {
  account: AccountFinance;
  locale: Locale;
  requestKey: string;
  today: string;
  submit: FinanceAction;
  onSuccess: (id: string) => void;
}) {
  const t = financeText(locale),
    brand = account.party.kind === "brand";
  const [amount, setAmount] = useState(
      new Decimal(account.balance.outstanding).gt(0)
        ? account.balance.outstanding
        : "",
    ),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const label = brand
    ? t("Record payment received", "მიღებული გადახდის აღრიცხვა")
    : t("Record payout made", "გაცემული გადახდის აღრიცხვა");
  let projected: string | undefined;
  try {
    if (/^\d+(\.\d{1,2})?$/.test(amount))
      projected = new Decimal(account.balance.outstanding)
        .minus(amount)
        .toFixed(2);
  } catch {
    /* Invalid input is handled on submit. */
  }
  return (
    <form
      className="finance-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending) return;
        const data = new FormData(e.currentTarget);
        setPending(true);
        setError("");
        try {
          const result = await submit({
            requestKey,
            party: account.party,
            amount,
            transferredOn: data.get("transferredOn"),
            bankReference: data.get("bankReference"),
            note: data.get("note"),
            ...(data.get("invoiceId")
              ? { invoiceId: data.get("invoiceId") }
              : {}),
          });
          if (result.ok) onSuccess(result.value.id);
          else setError(financeError(result.error, locale));
        } catch {
          setError(financeError("network", locale));
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="finance-transfer-direction">
        <strong>
          {brand ? `${account.name} → Xurjin` : `Xurjin → ${account.name}`}
        </strong>
        <p>
          {brand
            ? t(
                "Record a transfer received outside Xurjin. This action sends no money.",
                "აღრიცხეთ Xurjin-ის გარეთ მიღებული გადარიცხვა. ეს მოქმედება თანხას არ აგზავნის.",
              )
            : t(
                "Record a transfer made outside Xurjin. This action sends no money.",
                "აღრიცხეთ Xurjin-ის გარეთ შესრულებული გადარიცხვა. ეს მოქმედება თანხას არ აგზავნის.",
              )}
        </p>
      </div>
      <Field
        id="payment-amount"
        name="amount"
        label={t("Amount (GEL)", "თანხა (GEL)")}
        inputMode="decimal"
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Field
        id="payment-date"
        name="transferredOn"
        label={t("Transfer date", "გადარიცხვის თარიღი")}
        type="date"
        defaultValue={today}
        required
      />
      <Field
        id="payment-reference"
        name="bankReference"
        label={t(
          "Bank reference (optional)",
          "ბანკის მითითება (არასავალდებულო)",
        )}
        maxLength={160}
      />
      <label>
        {t(
          "Related invoice (optional)",
          "დაკავშირებული ინვოისი (არასავალდებულო)",
        )}
        <select
          name="invoiceId"
          defaultValue=""
          aria-describedby="invoice-reference-hint"
        >
          <option value="">{t("No invoice", "ინვოისის გარეშე")}</option>
          {account.invoices.items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.number}
            </option>
          ))}
        </select>
      </label>
      <p id="invoice-reference-hint">
        {t(
          "Reference only; does not settle an invoice.",
          "მხოლოდ მითითებაა; ინვოისს არ ფარავს.",
        )}
      </p>
      <label htmlFor="payment-note">
        {t("Note (optional)", "შენიშვნა (არასავალდებულო)")}
      </label>
      <textarea
        id="payment-note"
        name="note"
        maxLength={1000}
        aria-describedby="payment-note-hint"
      />
      <p id="payment-note-hint">
        {t("Visible to", "ხილულია ანგარიშისთვის:")} {account.name}
      </p>
      {projected !== undefined && (
        <div className="finance-note">
          <span>
            {t(
              "Projected balance after recording",
              "მოსალოდნელი ბალანსი აღრიცხვის შემდეგ",
            )}
          </span>
          <strong>{financeMoney(projected, locale)}</strong>
        </div>
      )}
      {error && (
        <p role="alert" className="finance-error">
          {error}
        </p>
      )}
      <Button className="finance-primary" type="submit" pending={pending}>
        {pending ? t("Saving…", "ინახება…") : label}
      </Button>
    </form>
  );
}
