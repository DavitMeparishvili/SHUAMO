import type { ReactNode } from "react";
import { getMessages, t, type Locale } from "@/src/modules/localization";
import { MobileTabBar } from "./mobile-tab-bar";
import type { Viewer } from "./nav-model";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { UtilityStrip } from "./utility-strip";

export function AppShell({
  locale,
  viewer,
  children,
}: {
  locale: Locale;
  viewer: Viewer;
  children: ReactNode;
}) {
  const messages = getMessages(locale);

  return (
    <>
      <a
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-sm bg-signal px-4 py-3 font-semibold text-paper transition-transform focus:translate-y-0"
        href="#main"
      >
        {t(messages, "nav.skipToContent")}
      </a>
      <UtilityStrip locale={locale} messages={messages} />
      <SiteHeader locale={locale} messages={messages} viewer={viewer} />
      <main id="main">{children}</main>
      <SiteFooter locale={locale} messages={messages} />
      <MobileTabBar locale={locale} messages={messages} viewer={viewer} />
    </>
  );
}
