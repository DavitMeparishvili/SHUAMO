"use client";

import { useParams } from "next/navigation";
import {
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
  t,
} from "@/src/modules/localization";

// Rendered inside app/[locale]/layout.tsx, which already supplies the document
// and the <main> landmark, so this contributes only the message.
//
// A not-found boundary receives no `params` prop, so — like error.tsx — the
// locale comes from the router. Hardcoding it would serve Georgian copy inside
// the <html lang="en"> that the layout emits on /en.
export default function LocaleNotFound() {
  const params = useParams<{ locale: string }>();
  const locale =
    typeof params?.locale === "string" && isLocale(params.locale)
      ? params.locale
      : DEFAULT_LOCALE;
  const messages = getMessages(locale);

  return (
    <>
      <h1>{t(messages, "notFound.title")}</h1>
      <p>{t(messages, "notFound.body")}</p>
    </>
  );
}
