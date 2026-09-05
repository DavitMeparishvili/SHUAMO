import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { getMessages, isLocale, LOCALES, t } from "@/src/modules/localization";
import { AppShell } from "@/src/modules/shell";
import { currentViewer } from "@/src/modules/identity";
import { serverEnv } from "@/src/config/env";

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
    metadataBase: new URL(serverEnv().APP_URL),
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
  const viewer = await currentViewer();

  return (
    <html
      className={GeistMono.variable}
      data-scroll-behavior="smooth"
      lang={locale}
    >
      <body>
        <span
          hidden
          data-xurjin-direction-contract="THESIS: creator commerce connects brands with measurable sales. OWN-WORLD: user-provided Xurjin screenshots; navy navigation, luminous blue-purple actions, white panels, rounded sans typography, photography. STORY: discover, register, collaborate, measure real GEL results. FIRST VIEWPORT: globe hero with left-aligned three-line heading above paired seller and creator photographs; workspace sidebar and card dashboard. FORM: user-pinned reference images override seed 72b40c2d. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md"
        />
        <span
          data-profile-direction="phase-06-5-passport-proof-ledger"
          hidden
        />
        <AppShell locale={locale} viewer={viewer}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
