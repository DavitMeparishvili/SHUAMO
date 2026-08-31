"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@/src/modules/localization";

function pathForLocale(pathname: string, locale: Locale): string {
  return pathname.replace(/^\/(?:ka|en)(?=\/|$)/, `/${locale}`);
}

export function LocaleSwitch({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1" aria-label={label}>
      {(["ka", "en"] as const).map((candidate) => (
        <a
          className={`inline-flex min-h-[44px] min-w-11 items-center justify-center rounded-pill px-3 type-caption font-bold no-underline ${candidate === locale ? "bg-paper text-ink" : "text-on-inverse hover:bg-slate-800"}`}
          href={pathForLocale(pathname, candidate)}
          hrefLang={candidate}
          aria-current={candidate === locale ? "true" : undefined}
          key={candidate}
          lang={candidate}
        >
          {candidate.toUpperCase()}
        </a>
      ))}
    </nav>
  );
}
