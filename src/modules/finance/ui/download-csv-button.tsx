"use client";
import { useState } from "react";
import type { Locale } from "@/src/modules/localization";
import { financeText, financeError } from "./finance-copy";
export function DownloadCsvButton({
  href,
  locale,
  allRows = true,
}: {
  href: string;
  locale: Locale;
  allRows?: boolean;
}) {
  const t = financeText(locale),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="finance-export">
      <button
        className="finance-button finance-primary"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          try {
            const response = await fetch(href);
            if (!response.ok) {
              const body = await response.json();
              setError(financeError(body.error, locale));
              return;
            }
            if (!response.headers.get("content-type")?.startsWith("text/csv"))
              throw new Error("invalid response");
            const blob = await response.blob(),
              url = URL.createObjectURL(blob),
              a = document.createElement("a");
            a.href = url;
            a.download =
              response.headers
                .get("content-disposition")
                ?.match(/filename="([^"]+)"/)?.[1] || "xurjin-report.csv";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch {
            setError(financeError("network", locale));
          } finally {
            setPending(false);
          }
        }}
      >
        {pending
          ? t("Preparing…", "მზადდება…")
          : t("Download CSV", "CSV-ის ჩამოტვირთვა")}
      </button>
      {allRows && (
        <small>{t("All matching rows", "ყველა შესაბამისი ჩანაწერი")}</small>
      )}
      {error && (
        <p role="alert" className="finance-error">
          {error}
        </p>
      )}
    </div>
  );
}
