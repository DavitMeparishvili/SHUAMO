import type { Locale } from "@/src/modules/localization";
import type { Viewer } from "@/src/modules/identity";

export type { Viewer } from "@/src/modules/identity";

export interface NavDestination {
  href: string;
  labelKey: string;
}

const ROUTES = {
  anonymous: [
    { path: "products", labelKey: "nav.discoverProducts" },
    { path: "creators", labelKey: "nav.discoverCreators" },
    { path: "brands", labelKey: "nav.discoverBrands" },
    { path: "sign-in", labelKey: "nav.signIn" },
  ],
  brand: [
    { path: "brand/finance", labelKey: "nav.finance" },
    { path: "brand/orders", labelKey: "nav.orders" },
    { path: "brand/performance", labelKey: "nav.performance" },
    { path: "brand/products", labelKey: "nav.catalog" },
    { path: "products", labelKey: "nav.discoverProducts" },
    { path: "brand/creators", labelKey: "nav.creators" },
    { path: "brand/links", labelKey: "nav.links" },
    { path: "brand/profile", labelKey: "nav.profile" },
  ],
  creator: [
    { path: "creator/finance", labelKey: "nav.finance" },
    { path: "products", labelKey: "nav.discoverProducts" },
    { path: "creator/links", labelKey: "nav.links" },
    { path: "creator/earnings", labelKey: "nav.performance" },
    { path: "creator/brands", labelKey: "nav.brands" },
    { path: "creator/profile", labelKey: "nav.profile" },
  ],
  admin: [
    { path: "products", labelKey: "nav.discoverProducts" },
    { path: "admin/finance", labelKey: "nav.finance" },
    { path: "admin/products", labelKey: "nav.catalog" },
    { path: "admin/performance", labelKey: "nav.performance" },
  ],
} as const;

export function navDestinationsFor(
  viewer: Viewer,
  locale: Locale,
): NavDestination[] {
  const destinations: NavDestination[] = ROUTES[viewer.kind].map(
    ({ path, labelKey }) => ({
      href: `/${locale}/${path}`,
      labelKey,
    }),
  );
  if (viewer.kind === "creator" && viewer.isTeamLead === true) {
    const performance = destinations.findIndex(
      (destination) => destination.href === `/${locale}/creator/earnings`,
    );
    destinations.splice(performance + 1, 0, {
      href: `/${locale}/creator/team`,
      labelKey: "nav.team",
    });
  }
  if ((viewer.kind === "brand" || viewer.kind === "creator") && viewer.isAdmin)
    destinations.push({
      href: `/${locale}/admin/finance`,
      labelKey: "nav.finance",
    });
  return destinations;
}
