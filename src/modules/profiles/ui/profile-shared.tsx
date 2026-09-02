import type { ReactNode } from "react";
import type { Locale } from "@/src/modules/localization";
import {
  resolveLocalizedText,
  type LocalizedText,
} from "../domain/localized-profile-text";

export function localized(ka: string, en: string, locale: Locale) {
  return resolveLocalizedText({ ka, en }, locale);
}
export function FallbackLabel({
  from,
  copy,
}: {
  from: Locale | undefined;
  copy: string;
}) {
  return from ? (
    <span className="ml-2 rounded-pill bg-slate-100 px-2 py-1 type-caption text-slate-600">
      {copy.replace("{locale}", from.toUpperCase())}
    </span>
  ) : null;
}
export function ExternalLink({
  href,
  children,
  leaveLabel,
}: {
  href: string;
  children: ReactNode;
  leaveLabel: string;
}) {
  return (
    <a
      className="inline-flex min-h-11 items-center gap-2 font-semibold text-signal"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <span aria-hidden="true">↗</span>
      <span className="sr-only"> {leaveLabel}</span>
    </a>
  );
}
export function asLocalized(value: unknown): LocalizedText {
  const row =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    ka: typeof row.ka === "string" ? row.ka : "",
    en: typeof row.en === "string" ? row.en : "",
  };
}
