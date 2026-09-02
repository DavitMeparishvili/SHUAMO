import type { Locale } from "@/src/modules/localization";
import type { Viewer } from "@/src/modules/identity";

export type { Viewer } from "@/src/modules/identity";

export interface NavDestination {
  href: string;
  labelKey: string;
  pending?: { count: number; oldestDays: number };
}

const ROUTES = {
  anonymous: [
    { path: "products", labelKey: "nav.discoverProducts" },
    { path: "creators", labelKey: "nav.discoverCreators" },
    { path: "brands", labelKey: "nav.discoverBrands" },
    { path: "sign-in", labelKey: "nav.signIn" },
  ],
  brand: [
    { path: "brand/orders", labelKey: "nav.orders" },
    { path: "brand/performance", labelKey: "nav.performance" },
    { path: "brand/products", labelKey: "nav.catalog" },
    { path: "products", labelKey: "nav.discoverProducts" },
    { path: "brand/creators", labelKey: "nav.creators" },
    { path: "brand/links", labelKey: "nav.links" },
    { path: "brand/profile", labelKey: "nav.profile" },
  ],
  creator: [
    { path: "products", labelKey: "nav.discoverProducts" },
    { path: "creator/links", labelKey: "nav.links" },
    { path: "creator/earnings", labelKey: "nav.performance" },
    { path: "creator/brands", labelKey: "nav.brands" },
    { path: "creator/profile", labelKey: "nav.profile" },
  ],
  admin: [
    { path: "products", labelKey: "nav.discoverProducts" },
    { path: "admin/periods", labelKey: "nav.periods" },
    { path: "admin/invoices", labelKey: "nav.invoices" },
    { path: "admin/payouts", labelKey: "nav.payouts" },
    { path: "admin/adjustments", labelKey: "nav.adjustments" },
  ],
} as const;

export function navDestinationsFor(
  viewer: Viewer,
  locale: Locale,
  pendingOrders?: { count: number; oldestDays: number },
): NavDestination[] {
  return ROUTES[viewer.kind].map(({ path, labelKey }) => ({
    href: `/${locale}/${path}`,
    labelKey,
    ...(viewer.kind === "brand" &&
    path === "brand/orders" &&
    pendingOrders !== undefined &&
    pendingOrders.count > 0
      ? { pending: pendingOrders }
      : {}),
  }));
}
