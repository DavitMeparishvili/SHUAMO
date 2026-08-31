"use client";

import { useParams } from "next/navigation";
import {
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
  t,
} from "@/src/modules/localization";

// An error boundary is a client component, so it cannot await `params`. The
// locale still comes from the URL rather than a hardcoded default; the default
// only applies if the segment is somehow unreadable.
export default function LocaleError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const params = useParams<{ locale: string }>();
  const locale =
    typeof params?.locale === "string" && isLocale(params.locale)
      ? params.locale
      : DEFAULT_LOCALE;
  const messages = getMessages(locale);

  return (
    <>
      <h1>{t(messages, "error.title")}</h1>
      <button type="button" onClick={reset}>
        {t(messages, "error.retry")}
      </button>
    </>
  );
}
