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
    tab: ka ? "მაღაზია" : "Shop",
    title: ka ? "ჩემი მაღაზია" : "My shop",
    summary: ka
      ? "პროფილზე ჩანს {shown} · დამალულია {hidden}"
      : "{shown} shown on profile · {hidden} hidden",
    add: ka ? "პროდუქტების დამატება" : "Add products",
    addCount: ka ? "დამატება ({count})" : "Add ({count})",
    viewProfile: ka ? "პროფილის ნახვა" : "View profile",
    show: ka ? "პროფილზე ჩვენება" : "Show on profile",
    moveTop: ka ? "თავში გადატანა" : "Move to top",
    moveUp: ka ? "ზემოთ" : "Move up",
    moveDown: ka ? "ქვემოთ" : "Move down",
    moveBottom: ka ? "ბოლოში გადატანა" : "Move to bottom",
    remove: ka ? "მაღაზიიდან წაშლა" : "Remove from shop",
    filterAll: ka ? "ყველა" : "All",
    filterShown: ka ? "ჩანს" : "Shown",
    filterHidden: ka ? "დამალული" : "Hidden",
    filterLabel: ka ? "ფილტრი" : "Filter",
    saving: ka ? "ინახება…" : "Saving…",
    saved: ka ? "შენახულია" : "Saved",
    failed: ka ? "ვერ შეინახა." : "Couldn't save.",
    retry: ka ? "ხელახლა" : "Retry",
    reason: {
      unavailable: ka
        ? "ბმული მიუწვდომელია · არ ჩანს"
        : "Link unavailable · not shown",
      "not-started": ka
        ? "ჯერ არ დაწყებულა · არ ჩანს"
        : "Not started yet · not shown",
      ended: ka ? "შეთავაზება დასრულდა · არ ჩანს" : "Offer ended · not shown",
      "no-photo": ka ? "ფოტო არ არის · არ ჩანს" : "No photo · not shown",
    },
    emptyTitle: ka ? "შექმენით თქვენი მაღაზია" : "Build your shop",
    emptyBody: ka
      ? "აირჩიეთ პროდუქტები თქვენი Xurjin ბმულებიდან. გამომწერები მათ კატალოგის სახით ნახავენ."
      : "Pick products from your Xurjin links. Followers see them as a catalog on your profile.",
    noLinks: ka ? "ჯერ აიღეთ ბმულები" : "Get links first",
    unpublished: ka
      ? "მაღაზია გამოჩნდება პროფილის გამოქვეყნების შემდეგ."
      : "Your shop will be visible once your profile is published.",
    search: ka ? "პროდუქტების ძებნა" : "Search products",
    preview: ka ? "ცოცხალი გადახედვა" : "Live preview",
    more: ka ? "მეტი მოქმედება: {title}" : "More actions for {title}",
    reorder: ka ? "გადაადგილება: {title}" : "Reorder {title}",
    picked: ka ? "აიღეთ {title}" : "Picked up {title}",
    dropped: ka
      ? "{title} ჩაიდო პოზიციაზე {n}"
      : "Dropped {title} at position {n}",
    moved: ka ? "გადავიდა პოზიციაზე {n}" : "Moved to position {n}",
    cancelled: ka ? "გადაადგილება გაუქმდა" : "Reorder cancelled",
    allAdded: ka
      ? "ყველა პროდუქტი, რომლის ბმულიც გაქვთ, უკვე მაღაზიაშია."
      : "Every product you have a link for is already in your shop.",
    close: ka ? "დახურვა" : "Close",
    unavailableCount: ka ? "არ ჩანს {count}" : "{count} not shown",
    manageShop: ka ? "მაღაზიის მართვა" : "Manage shop",
    addToYourShop: ka
      ? "დაამატეთ პროდუქტები მაღაზიაში"
      : "Add products to your shop",
    addToShop: ka ? "მაღაზიაში დამატება" : "Add to shop",
    inShop: ka ? "მაღაზიაშია" : "In shop",
  };
}

export type CreatorShopCopy = ReturnType<typeof creatorShopCopy>;
