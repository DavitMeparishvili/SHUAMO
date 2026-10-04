import { notFound } from "next/navigation";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/src/modules/design-system";
import { LandingDetails, LandingFaq, LandingProcess } from "./landing-content";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = getMessages(locale);

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
            <span>{t(messages, "landing.hero.headingStart")}</span>
            <span>{t(messages, "landing.hero.headingProduct")}</span>
            <span className="gradient-text">
              {t(messages, "landing.hero.headingEnd")}
            </span>
          </h1>
          <p>{t(messages, "landing.hero.description")}</p>
          <div className="hero-actions">
            <Link className="x-button primary" href={`/${locale}/sign-up`}>
              {t(messages, "landing.getStarted")}
            </Link>
            <a className="video-link" href="#how-it-works">
              <span>
                <Icon name="arrow" />
              </span>
              {t(messages, "landing.howLink")}
            </a>
          </div>
          <small className="hero-registration-note">
            {t(messages, "landing.registrationNote")}
          </small>
        </div>
      </section>
      <div className="landing-body">
        <section
          className="audience-grid"
          aria-label={t(messages, "landing.audience.label")}
        >
          <a className="audience-card" href="#for-brands">
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
            <h2>{t(messages, "landing.audience.brands.title")}</h2>
            <p>{t(messages, "landing.audience.brands.description")}</p>
            <span className="learn-more">
              {t(messages, "landing.learnMore")}
              <Icon name="arrow" />
            </span>
          </a>
          <a className="audience-card" href="#for-creators">
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
            <h2>{t(messages, "landing.audience.creators.title")}</h2>
            <p>{t(messages, "landing.audience.creators.description")}</p>
            <span className="learn-more">
              {t(messages, "landing.learnMore")}
              <Icon name="arrow" />
            </span>
          </a>
        </section>
        <LandingProcess locale={locale} />
        <LandingDetails locale={locale} />
        <LandingFaq locale={locale} />
        <section className="join-banner">
          <span className="join-icon">
            <Icon name="users" />
          </span>
          <div>
            <h2>{t(messages, "landing.join.title")}</h2>
            <p>{t(messages, "landing.join.body")}</p>
          </div>
          <Link className="x-button dark" href={`/${locale}/sign-up`}>
            {t(messages, "landing.join.action")}
            <Icon name="arrow" />
          </Link>
        </section>
      </div>
    </>
  );
}
