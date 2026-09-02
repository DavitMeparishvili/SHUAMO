import type { Locale, Messages } from "@/src/modules/localization";
import { t } from "@/src/modules/localization";
import { navDestinationsFor, type Viewer } from "./nav-model";

export function SiteHeader({
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
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-16 max-w-[var(--layout-column)] items-center justify-between gap-8 px-[var(--layout-gutter)] max-[1179px]:px-[var(--layout-gutter-md)] max-[639px]:px-[var(--layout-gutter-sm)]">
        <a
          className="type-h3 font-bold tracking-[-0.02em] text-ink no-underline"
          href={`/${locale}`}
        >
          {t(messages, "app.name")}
        </a>
        <nav
          className="flex items-center gap-2 max-[639px]:hidden"
          aria-label={t(messages, "nav.primary")}
        >
          {destinations.map((destination, index) => (
            <a
              className={`inline-flex min-h-[44px] items-center rounded-pill px-4 type-small font-semibold no-underline ${viewer.kind === "anonymous" && index === 0 ? "bg-signal text-paper hover:bg-signal-hover active:bg-signal-active" : "text-slate-700 hover:bg-slate-100"}`}
              href={destination.href}
              key={destination.href}
            >
              {t(messages, destination.labelKey)}
              {destination.pending ? (
                <span
                  className="ml-2 rounded-pill bg-accrued-soft px-2 py-0.5 type-caption text-accrued"
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
      </div>
    </header>
  );
}
