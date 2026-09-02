type Locale = "ka" | "en";

export interface LocalizedText {
  ka: string;
  en: string;
}
export interface ResolvedLocalizedText {
  text: string;
  fallbackFrom?: Locale;
}

export function resolveLocalizedText(
  value: LocalizedText,
  locale: Locale,
): ResolvedLocalizedText {
  const direct = value[locale].trim();
  if (direct) return { text: direct };
  const fallback: Locale = locale === "ka" ? "en" : "ka";
  const text = value[fallback].trim();
  return text ? { text, fallbackFrom: fallback } : { text: "" };
}
