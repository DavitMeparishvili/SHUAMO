import type { ReactNode } from "react";
import { getMessages, t, type Locale } from "@/src/modules/localization";
import type { Viewer } from "./nav-model";
import { SiteFrame } from "./site-frame";
import { MARKETING_KEYS, type MarketingCopy } from "./marketing-copy";
import { ProfilePrivacyNotice } from "@/src/modules/profiles";
export function AppShell({
  locale,
  viewer,
  children,
  profilePublished = true,
}: {
  locale: Locale;
  viewer: Viewer;
  children: ReactNode;
  profilePublished?: boolean;
}) {
  const messages = getMessages(locale);
  const marketingCopy = Object.fromEntries(
    MARKETING_KEYS.map((key) => [key, t(messages, `marketing.${key}`)]),
  ) as MarketingCopy;
  return (
    <SiteFrame
      locale={locale}
      viewer={viewer}
      marketingCopy={marketingCopy}
      profilePublished={profilePublished}
      profilePrivacyNotice={
        !profilePublished &&
        (viewer.kind === "brand" || viewer.kind === "creator") ? (
          <ProfilePrivacyNotice locale={locale} role={viewer.kind} />
        ) : null
      }
    >
      {children}
    </SiteFrame>
  );
}
