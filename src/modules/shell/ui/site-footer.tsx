import type { Locale, Messages } from "@/src/modules/localization";
import { t } from "@/src/modules/localization";

export function SiteFooter({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-8 min-[640px]:pb-8">
      <div className="mx-auto flex max-w-[var(--layout-column)] flex-col justify-between gap-4 px-[var(--layout-gutter)] type-small text-slate-600 min-[640px]:flex-row min-[640px]:items-center max-[1179px]:px-[var(--layout-gutter-md)] max-[639px]:px-[var(--layout-gutter-sm)]">
        <p className="m-0">{t(messages, "footer.provenance")}</p>
        <a href={`/${locale}/help`}>{t(messages, "nav.help")}</a>
      </div>
    </footer>
  );
}
