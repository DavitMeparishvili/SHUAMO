import type { ReactNode } from "react";
import type { Locale } from "@/src/modules/localization";
import type { Viewer } from "./nav-model";
import { SiteFrame } from "./site-frame";
export function AppShell({
  locale,
  viewer,
  children,
}: {
  locale: Locale;
  viewer: Viewer;
  children: ReactNode;
}) {
  return (
    <SiteFrame locale={locale} viewer={viewer}>
      {children}
    </SiteFrame>
  );
}
