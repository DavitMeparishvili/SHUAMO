import type { Locale } from "@/src/modules/localization";
import type { Viewer } from "@/src/modules/identity";

export type { Viewer } from "@/src/modules/identity";

export interface NavDestination {
  href: string;
  labelKey: string;
}

const ROUTES = {
  anonymous: [{ path: "sign-in", labelKey: "nav.signIn" }],
  brand: [
    { path: "brand/orders", labelKey: "nav.orders" },
    { path: "brand/catalog", labelKey: "nav.catalog" },
    { path: "brand/creators", labelKey: "nav.creators" },
  ],
  creator: [
    { path: "creator/links", labelKey: "nav.links" },
    { path: "creator/earnings", labelKey: "nav.earnings" },
    { path: "creator/brands", labelKey: "nav.brands" },
  ],
  admin: [
    { path: "admin/periods", labelKey: "nav.periods" },
    { path: "admin/invoices", labelKey: "nav.invoices" },
    { path: "admin/payouts", labelKey: "nav.payouts" },
    { path: "admin/adjustments", labelKey: "nav.adjustments" },
  ],
} as const;

export function navDestinationsFor(
  viewer: Viewer,
  locale: Locale,
): NavDestination[] {
  return ROUTES[viewer.kind].map(({ path, labelKey }) => ({
    href: `/${locale}/${path}`,
    labelKey,
  }));
}
