import type { Locale, Messages } from "@/src/modules/localization";
import { t } from "@/src/modules/localization";
import { LocaleSwitch } from "./locale-switch";

export function UtilityStrip({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  return (
    <aside
      aria-label={t(messages, "shell.statement")}
      className="bg-ink text-on-inverse"
    >
      <div className="mx-auto flex min-h-8 max-w-[var(--layout-column)] items-center justify-between gap-4 px-[var(--layout-gutter)] max-[1179px]:px-[var(--layout-gutter-md)] max-[639px]:px-[var(--layout-gutter-sm)]">
        <p className="m-0 py-2 type-caption">
          {t(messages, "shell.statement")}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <a
            className="inline-flex min-h-[44px] items-center px-2 type-caption"
            href={`/${locale}/help`}
          >
            {t(messages, "nav.help")}
          </a>
          <LocaleSwitch locale={locale} label={t(messages, "nav.locale")} />
        </div>
      </div>
    </aside>
  );
}
