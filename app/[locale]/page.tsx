import { notFound } from "next/navigation";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/src/modules/design-system";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = getMessages(locale);
  const text = (en: string, ka: string) => (locale === "ka" ? ka : en);

  return (
    <>
      <section
        className="landing-hero"
        id="why-xurjin"
        aria-label={t(messages, "app.name")}
      >
        <div className="hero-globe">
          <Image src="/images/globe.webp" alt="" fill priority sizes="100vw" />
        </div>
        <div className="landing-hero-inner">
          <h1>
            <span>{text("Connecting Brands,", "ვაკავშირებთ ბრენდებს,")}</span>
            <span>
              {text("Empowering Creators,", "ვაძლიერებთ კრეატორებს,")}
            </span>
            <span className="gradient-text">
              {text("Inspiring Shoppers.", "შთაგვაგონებთ ყველას.")}
            </span>
          </h1>
          <p>
            {text(
              "Xurjin is the creator-commerce platform where brands and creators in Georgia come together to discover, connect, and grow with confidence.",
              "Xurjin არის პლატფორმა, სადაც ბრენდები და კრეატორები საქართველოში ერთად აღმოაჩენენ, თანამშრომლობენ და ქმნიან ახალ შესაძლებლობებს.",
            )}
          </p>
          <div className="hero-actions">
            <Link className="x-button primary" href={`/${locale}/sign-up`}>
              {text("Get started", "დაიწყე ახლავე")}
            </Link>
            <Link
              className="video-link"
              href={`/${locale}/coming-soon?feature=demo`}
            >
              <span>
                <Icon name="play" />
              </span>
              {text("Watch demo", "ვიდეოს ნახვა")}
            </Link>
          </div>
        </div>
      </section>
      <div className="landing-body">
        <section
          className="audience-grid"
          aria-label={text("Find your place", "იპოვე შენი ადგილი")}
        >
          <Link
            className="audience-card"
            href={`/${locale}/sign-up?role=brand`}
          >
            <Image
              src="/images/seller.webp"
              alt=""
              fill
              priority
              sizes="(max-width:720px) 100vw, 50vw"
            />
            <span className="audience-icon">
              <Icon name="shop" />
            </span>
            <h2>{text("For Sellers", "გამყიდველებისთვის")}</h2>
            <p>
              {text(
                "Reach new audiences through trusted creators and measurable results.",
                "მიაწვდინე ხმა ახალ მომხმარებლებს სანდო კრეატორების მეშვეობით.",
              )}
            </p>
            <span className="learn-more">
              {text("Learn more", "გაიგე მეტი")}
              <Icon name="arrow" />
            </span>
          </Link>
          <Link
            className="audience-card"
            href={`/${locale}/sign-up?role=creator`}
          >
            <Image
              src="/images/creator.webp"
              alt=""
              fill
              priority
              sizes="(max-width:720px) 100vw, 50vw"
            />
            <span className="audience-icon">
              <Icon name="user" />
            </span>
            <h2>{text("For Creators", "კრეატორებისთვის")}</h2>
            <p>
              {text(
                "Turn your influence into income with products you love and brands you trust.",
                "გადააქციე შენი კონტენტი რეალურ შემოსავლად საყვარელ ბრენდებთან ერთად.",
              )}
            </p>
            <span className="learn-more">
              {text("Learn more", "გაიგე მეტი")}
              <Icon name="arrow" />
            </span>
          </Link>
        </section>
        <section className="how-section" id="how-it-works">
          <h2>{text("How Xurjin works", "როგორ მუშაობს Xurjin")}</h2>
          <div className="steps">
            {[
              [
                text("Connect", "დაკავშირება"),
                text(
                  "Brands share their products and offers. Creators discover a brand and apply to collaborate.",
                  "ბრენდები აქვეყნებენ პროდუქტებსა და პირობებს. კრეატორები პოულობენ საინტერესო შეთავაზებებს.",
                ),
              ],
              [
                text("Create & collaborate", "თანამშრომლობა"),
                text(
                  "Once approved, creators accept product terms, create a personal link, and share it with their audience.",
                  "დადასტურების შემდეგ, კრეატორები იღებენ პირობებს და აუდიტორიას უზიარებენ პირად ბმულებს.",
                ),
              ],
              [
                text("Grow together", "შედეგი"),
                text(
                  "Track real sales and earned commissions in GEL. See the results of every connection.",
                  "თვალი ადევნე რეალურ გაყიდვებსა და საკომისიოს ლარში. აღმოაჩინე თანამშრომლობის შედეგები.",
                ),
              ],
            ].map(([title, body], i) => (
              <div className="step" key={title}>
                <span className="step-number">{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="join-banner">
          <span className="join-icon">
            <Icon name="mail" />
          </span>
          <div>
            <h2>
              {text(
                "Your next opportunity starts here",
                "შენი ახალი შესაძლებლობა აქ იწყება",
              )}
            </h2>
            <p>
              {text(
                "Join the Xurjin community. Create your account and take the first step toward your next collaboration.",
                "შეუერთდი Xurjin-ის საზოგადოებას. შექმენი ანგარიში და გადადგი პირველი ნაბიჯი ახალი თანამშრომლობისკენ.",
              )}
            </p>
          </div>
          <Link className="x-button dark" href={`/${locale}/sign-up`}>
            {text("Create an account", "შექმენი ანგარიში")}
            <Icon name="arrow" />
          </Link>
        </section>
      </div>
    </>
  );
}
