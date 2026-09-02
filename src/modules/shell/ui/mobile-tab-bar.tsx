import type { Locale, Messages } from "@/src/modules/localization";
import { t } from "@/src/modules/localization";
import { navDestinationsFor, type Viewer } from "./nav-model";

export function MobileTabBar({
  locale,
  messages,
  viewer,
  pendingOrders,
}: {
  locale: Locale;
  messages: Messages;
  viewer: Viewer;
  pendingOrders?: { count: number; oldestDays: number } | undefined;
}) {
  const destinations = navDestinationsFor(viewer, locale, pendingOrders);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid min-h-16 auto-cols-fr grid-flow-col border-t border-slate-300 bg-paper px-2 pb-[env(safe-area-inset-bottom)] shadow-md min-[640px]:hidden"
      aria-label={t(messages, "nav.mobile")}
    >
      {destinations.map((destination) => (
        <a
          className="flex min-h-[44px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-sm px-1 text-center type-caption font-bold text-slate-700 no-underline hover:bg-slate-100"
          href={destination.href}
          key={destination.href}
        >
          {t(messages, destination.labelKey)}
          {destination.pending ? (
            <span
              className="whitespace-nowrap rounded-pill bg-accrued-soft px-1.5 text-accrued"
              aria-label={t(messages, "nav.pendingOrdersDetail")
                .replace("{count}", String(destination.pending.count))
                .replace("{days}", String(destination.pending.oldestDays))}
            >
              {t(messages, "nav.pendingOrdersCompact")
                .replace("{count}", String(destination.pending.count))
                .replace("{days}", String(destination.pending.oldestDays))}
            </span>
          ) : null}
        </a>
      ))}
    </nav>
  );
}
