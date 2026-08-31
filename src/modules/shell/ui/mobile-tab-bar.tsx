import type { Locale, Messages } from "@/src/modules/localization";
import { t } from "@/src/modules/localization";
import { navDestinationsFor, type Viewer } from "./nav-model";

export function MobileTabBar({
  locale,
  messages,
  viewer,
}: {
  locale: Locale;
  messages: Messages;
  viewer: Viewer;
}) {
  const destinations = navDestinationsFor(viewer, locale);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid min-h-16 grid-flow-col border-t border-slate-300 bg-paper px-2 pb-[env(safe-area-inset-bottom)] shadow-md min-[640px]:hidden"
      aria-label={t(messages, "nav.mobile")}
    >
      {destinations.map((destination) => (
        <a
          className="flex min-h-[44px] items-center justify-center rounded-sm px-3 text-center type-caption font-bold text-slate-700 no-underline hover:bg-slate-100"
          href={destination.href}
          key={destination.href}
        >
          {t(messages, destination.labelKey)}
        </a>
      ))}
    </nav>
  );
}
