import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { getMessages, isLocale, LOCALES, t } from "@/src/modules/localization";
import { AppShell } from "@/src/modules/shell";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// The locale list is closed, so an unlisted segment is a 404 before this layout
// renders. That is what puts an unknown locale on app/not-found.tsx — a full,
// translated document — instead of the framework's bare error shell. The
// notFound() below stays as the guard for anything that gets past this.
export const dynamicParams = false;

// WCAG 2.2 §2.4.2 (Level A, and so inside AA) requires every page to have a
// title that describes its topic. It is localised for the same reason the copy
// is: a Georgian page announcing itself in English is not a translated page.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const messages = getMessages(locale);

  return {
    title: t(messages, "meta.title"),
    description: t(messages, "meta.description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      lang={locale}
    >
      <body>
        <AppShell locale={locale} viewer={{ kind: "anonymous" }}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
