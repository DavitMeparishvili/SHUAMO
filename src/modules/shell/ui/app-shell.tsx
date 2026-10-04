import type { ReactNode } from "react";
import { getMessages, t, type Locale } from "@/src/modules/localization";
import type { Viewer } from "./nav-model";
import { SiteFrame } from "./site-frame";
import { MARKETING_KEYS, type MarketingCopy } from "./marketing-copy";
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
  const marketingCopy = Object.fromEntries(
    MARKETING_KEYS.map((key) => [key, t(messages, `marketing.${key}`)]),
  ) as MarketingCopy;
  return (
    <SiteFrame locale={locale} viewer={viewer} marketingCopy={marketingCopy}>
      {children}
    </SiteFrame>
  );
}
