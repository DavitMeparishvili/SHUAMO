import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isLocale, LOCALES } from "@/src/modules/localization/config";
import { getMessages, t } from "@/src/modules/localization/get-messages";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// The locale list is closed, so an unlisted segment is a 404 before this layout
// renders. That is what puts an unknown locale on app/not-found.tsx — a full,
// translated document — instead of the framework's bare error shell. The
// notFound() below stays as the guard for anything that gets past this.
export const dynamicParams = false;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = getMessages(locale);

  return (
    <html lang={locale}>
      <body>
        <a href="#main">{t(messages, "nav.skipToContent")}</a>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
