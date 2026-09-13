"use client";
import { useState } from "react";
import { Button, Field } from "@/src/modules/design-system";
import type { Locale } from "@/src/modules/localization";
import type { InvoicePreview } from "../ports/finance-repository";
import type {
  DocumentParty,
  FinanceParty,
  FinanceError,
} from "../domain/finance";
import type { Result } from "@/src/modules/shared";
import { financeText, financeError } from "./finance-copy";
import { InvoiceDocument } from "./invoice-document";
import type { FinanceAction } from "./payment-form";
import { BalanceSummary } from "./finance-summary";
export type PreviewAction = (
  party: FinanceParty,
) => Promise<Result<InvoicePreview, FinanceError>>;
export function InvoiceForm({
  initial,
  requestKey,
  locale,
  submit,
  refresh,
  onSuccess,
}: {
  initial: InvoicePreview;
  requestKey: string;
  locale: Locale;
  submit: FinanceAction;
  refresh: PreviewAction;
  onSuccess: (id: string) => void;
}) {
  const t = financeText(locale),
    [preview, setPreview] = useState(initial),
    [payer, setPayer] = useState(initial.payer),
    [payee, setPayee] = useState(initial.payee),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const fields: { key: keyof DocumentParty; label: string }[] = [
    { key: "name", label: t("Name", "სახელი") },
    {
      key: "identification",
      label: t("Identification", "საიდენტიფიკაციო ნომერი"),
    },
    { key: "address", label: t("Address", "მისამართი") },
    { key: "bank", label: t("Bank", "ბანკი") },
    { key: "iban", label: "IBAN" },
  ];
  return (
    <form
      className="finance-invoice-preview"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        try {
          const result = await submit({
            requestKey,
            party: preview.party,
            previewHash: preview.previewHash,
            payer,
            payee,
          });
          if (result.ok) onSuccess(result.value.id);
          else {
            setError(financeError(result.error, locale));
            if (result.error === "preview_changed") {
              const updated = await refresh(preview.party);
              if (updated.ok) setPreview(updated.value);
            }
          }
        } catch {
          setError(financeError("network", locale));
        } finally {
          setPending(false);
        }
      }}
    >
      <div>
        <InvoiceDocument
          invoice={{ ...preview, payer, payee }}
          locale={locale}
        />
        <details className="finance-panel finance-edit-details">
          <summary>{t("Edit details", "მონაცემების შეცვლა")}</summary>
          <div className="finance-document-parties">
            {(["payer", "payee"] as const).map((side) => (
              <fieldset key={side}>
                <legend>
                  {side === "payer"
                    ? t("Payable by", "გადამხდელი")
                    : t("Payable to", "მიმღები")}
                </legend>
                {fields.map((f) => (
                  <Field
                    key={f.key}
                    id={`${side}-${f.key}`}
                    label={f.label}
                    value={(side === "payer" ? payer : payee)[f.key]}
                    required={f.key === "name"}
                    maxLength={
                      f.key === "address" ? 500 : f.key === "iban" ? 100 : 200
                    }
                    onChange={(e) =>
                      (side === "payer" ? setPayer : setPayee)((old) => ({
                        ...old,
                        [f.key]: e.target.value,
                      }))
                    }
                  />
                ))}
              </fieldset>
            ))}
          </div>
        </details>
      </div>
      <aside className="finance-preview-aside">
        <h2>{t("Current account balance", "ანგარიშის მიმდინარე ბალანსი")}</h2>
        <BalanceSummary account={preview} locale={locale} />
        <p>
          {t(
            "Generating an invoice does not change this balance. Payments already recorded do not reduce new invoice lines.",
            "ინვოისის შექმნა ბალანსს არ ცვლის. აღრიცხული გადახდები ახალ ინვოისის სტრიქონებს არ ამცირებს.",
          )}
        </p>
        {error && (
          <p role="alert" className="finance-error">
            {error}
          </p>
        )}
        <Button
          className="finance-primary"
          type="submit"
          pending={pending}
          disabled={!preview.lines.length}
        >
          {pending
            ? t("Generating…", "იქმნება…")
            : t("Generate invoice", "ინვოისის შექმნა")}
        </Button>
      </aside>
    </form>
  );
}
