import type { Locale } from "@/src/modules/localization";

/** Replace `{name}` placeholders in shop copy. */
export function fillShopCopy(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export function creatorShopCopy(locale: Locale) {
  const ka = locale === "ka";
  return {
    heading: ka ? "ჩემი რჩეული პროდუქტები" : "Shop my picks",
    showMore: ka ? "მეტის ნახვა ({count})" : "Show more ({count})",
    opensShop: ka
      ? "{brand} – {title}, გაიხსნება მაღაზია"
      : "{brand} – {title}, opens shop",
    disclosure: ka
      ? "შეიცავს პარტნიორულ ბმულებს. შესაძლოა მივიღო საკომისიო."
      : "Contains affiliate links. I may earn a commission.",
  };
}

export type CreatorShopCopy = ReturnType<typeof creatorShopCopy>;
