import type { Metadata } from "next";
import Link from "next/link";
import { XurjinLogo } from "@/src/modules/design-system";
import "./globals.css";
import { DEFAULT_LOCALE, getMessages, t } from "@/src/modules/localization";

export const metadata: Metadata = {
  title: t(getMessages(DEFAULT_LOCALE), "notFound.title"),
};

// Reached when nothing matched at all, and when app/[locale]/layout.tsx itself
// calls notFound() for an unsupported locale — the throw happens above that
// layout, so this boundary must supply the whole document. Without it an
// unmatched route renders a body fragment with no <html> element.
export default function RootNotFound() {
  const messages = getMessages(DEFAULT_LOCALE);

  return (
    <html lang={DEFAULT_LOCALE}>
      <body>
        <header className="marketing-header">
          <Link
            className="brand-link"
            href={`/${DEFAULT_LOCALE}`}
            aria-label="Xurjin"
          >
            <XurjinLogo />
          </Link>
        </header>
        <main id="main" className="coming-soon-page">
          <span className="soon-label">404</span>
          <h1>{t(messages, "notFound.title")}</h1>
          <p>{t(messages, "notFound.body")}</p>
          <Link className="x-button primary" href="/ka">
            მთავარი / Home
          </Link>
        </main>
      </body>
    </html>
  );
}
