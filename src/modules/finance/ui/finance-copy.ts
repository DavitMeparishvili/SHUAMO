import type { Locale } from "@/src/modules/localization";
export const financeText = (locale: Locale) => (en: string, ka: string) =>
  locale === "ka" ? ka : en;
export function financeError(error: string, locale: Locale) {
  const t = financeText(locale);
  const errors: Record<string, string> = {
    invalid_input: t(
      "Check the amount, date and required fields.",
      "შეამოწმეთ თანხა, თარიღი და სავალდებულო ველები.",
    ),
    preview_changed: t(
      "Earnings changed. Review the updated invoice before generating it.",
      "შემოსავალი შეიცვალა. შექმნამდე გადახედეთ განახლებულ ინვოისს.",
    ),
    nothing_to_invoice: t(
      "Nothing new to invoice",
      "ინვოისისთვის ახალი ჩანაწერები არ არის",
    ),
    request_conflict: t(
      "This submission was already saved with different details. Close and reopen the form for a new record.",
      "ეს მოთხოვნა სხვა მონაცემებით უკვე შენახულია. ახალი ჩანაწერისთვის დახურეთ და ხელახლა გახსენით ფორმა.",
    ),
    retry_later: t(
      "The account is being updated. Try saving again.",
      "ანგარიში ახლდება. ხელახლა სცადეთ შენახვა.",
    ),
    export_too_large: t(
      "Too many rows to export. Narrow your filters and try again.",
      "ექსპორტისთვის მეტისმეტად ბევრი ჩანაწერია. დააზუსტეთ ფილტრები და სცადეთ ხელახლა.",
    ),
  };
  return (
    errors[error] ||
    t(
      "Unable to complete this request. Check your access and try again.",
      "მოთხოვნა ვერ შესრულდა. შეამოწმეთ წვდომა და სცადეთ ხელახლა.",
    )
  );
}
export function financeMoney(value: string, locale: Locale) {
  const negative = value.startsWith("-"),
    [whole = "0", fraction = "00"] = value.replace(/^-/, "").split(".");
  // Some browsers omit Georgian ICU data. Keep server and browser output
  // identical without converting exact monetary integers to floating point.
  const integer = BigInt(whole)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, locale === "ka" ? "\u00a0" : ",");
  const decimal = locale === "ka" ? "," : ".";
  return `${negative ? "−" : ""}${integer}${decimal}${fraction.padEnd(2, "0")} ${locale === "ka" ? "₾" : "GEL"}`;
}
export function financeDate(value: string, locale: Locale, time = false) {
  if (locale === "ka") {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tbilisi",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(value));
    const part = (type: string) => parts.find((p) => p.type === type)!.value;
    const months = [
      "იან.",
      "თებ.",
      "მარ.",
      "აპრ.",
      "მაი.",
      "ივნ.",
      "ივლ.",
      "აგვ.",
      "სექ.",
      "ოქტ.",
      "ნოე.",
      "დეკ.",
    ];
    return `${Number(part("day"))} ${months[Number(part("month")) - 1]} ${part("year")}${time ? `, ${part("hour")}:${part("minute")}` : ""}`;
  }
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(time ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
  }).format(new Date(value));
}
