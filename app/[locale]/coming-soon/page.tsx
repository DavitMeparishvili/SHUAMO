import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/src/modules/localization";
import { Icon } from "@/src/modules/design-system";
export default async function ComingSoon({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ feature?: string }>;
}) {
  const [{ locale }, { feature }] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const ka = locale === "ka";
  const names: Record<string, [string, string]> = {
    notifications: ["Notifications", "შეტყობინებები"],
    help: ["Help center", "დახმარების ცენტრი"],
    terms: ["Terms of service", "მომსახურების პირობები"],
    privacy: ["Privacy policy", "კონფიდენციალურობის პოლიტიკა"],
    demo: ["Video demo", "ვიდეო დემო"],
    payouts: ["Payouts", "გადახდები"],
    admin: ["Administration", "ადმინისტრირება"],
  };
  const name = names[feature ?? ""] ?? [
    "More possibilities",
    "ახალი შესაძლებლობები",
  ];
  return (
    <section className="coming-soon-page">
      <span className="metric-icon">
        <Icon name="box" />
      </span>
      <span className="soon-label">{ka ? "მალე" : "Coming soon"}</span>
      <h1>{name[ka ? 1 : 0]}</h1>
      <p>
        {ka
          ? "ეს განყოფილება ჯერ მზადების პროცესშია. მანამდე შეგიძლია აღმოაჩინო პროდუქტები და გაიცნო Xurjin-ის საზოგადოება."
          : "This part of Xurjin is still being prepared. In the meantime, explore products and discover your next collaboration."}
      </p>
      <Link className="x-button primary" href={`/${locale}/products`}>
        {ka ? "პროდუქტების ნახვა" : "Explore products"}
        <Icon name="arrow" />
      </Link>
    </section>
  );
}
