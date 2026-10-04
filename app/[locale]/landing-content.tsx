import Link from "next/link";
import { getMessages, t, type Locale } from "@/src/modules/localization";

export function LandingProcess({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const steps = ["publish", "share", "results"] as const;
  return (
    <section
      className="how-section"
      id="how-it-works"
      aria-labelledby="how-title"
    >
      <h2 id="how-title">{t(messages, "landing.how.title")}</h2>
      <p className="landing-section-intro">
        {t(messages, "landing.how.intro")}
      </p>
      <ol className="steps">
        {steps.map((step, index) => (
          <li className="step" key={step}>
            <span className="step-number" aria-hidden="true">
              {index + 1}
            </span>
            <div className="step-content">
              <h3>{t(messages, "landing.how." + step + ".title")}</h3>
              <p>{t(messages, "landing.how." + step + ".body")}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function LandingDetails({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const audiences = [
    {
      id: "for-brands",
      title: t(messages, "landing.brands.title"),
      intro: t(messages, "landing.brands.intro"),
      benefits: [
        [
          t(messages, "landing.brands.terms.title"),
          t(messages, "landing.brands.terms.body"),
        ],
        [
          t(messages, "landing.brands.partners.title"),
          t(messages, "landing.brands.partners.body"),
        ],
        [
          t(messages, "landing.brands.results.title"),
          t(messages, "landing.brands.results.body"),
        ],
      ],
      role: "brand",
      cta: t(messages, "landing.brands.action"),
    },
    {
      id: "for-creators",
      title: t(messages, "landing.creators.title"),
      intro: t(messages, "landing.creators.intro"),
      benefits: [
        [
          t(messages, "landing.creators.terms.title"),
          t(messages, "landing.creators.terms.body"),
        ],
        [
          t(messages, "landing.creators.results.title"),
          t(messages, "landing.creators.results.body"),
        ],
        [
          t(messages, "landing.creators.window.title"),
          t(messages, "landing.creators.window.body"),
        ],
      ],
      role: "creator",
      cta: t(messages, "landing.creators.action"),
    },
  ];

  return audiences.map((audience) => (
    <section
      className="landing-detail"
      id={audience.id}
      key={audience.id}
      aria-labelledby={`${audience.id}-title`}
    >
      <div className="landing-detail-intro">
        <h2 id={`${audience.id}-title`}>{audience.title}</h2>
        <p>{audience.intro}</p>
        <Link
          className="x-button primary"
          href={`/${locale}/sign-up?role=${audience.role}`}
        >
          {audience.cta}
        </Link>
        <small>{t(messages, "landing.registrationNote")}</small>
      </div>
      <dl className="landing-benefits">
        {audience.benefits.map(([title, body]) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{body}</dd>
          </div>
        ))}
      </dl>
    </section>
  ));
}

export function LandingFaq({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const questions = [
    [
      t(messages, "landing.faq.shop.question"),
      t(messages, "landing.faq.shop.answer"),
    ],
    [
      t(messages, "landing.faq.start.question"),
      t(messages, "landing.faq.start.answer"),
    ],
    [
      t(messages, "landing.faq.cost.question"),
      t(messages, "landing.faq.cost.answer"),
    ],
    [
      t(messages, "landing.faq.integration.question"),
      t(messages, "landing.faq.integration.answer"),
    ],
    [
      t(messages, "landing.faq.later.question"),
      t(messages, "landing.faq.later.answer"),
    ],
    [
      t(messages, "landing.faq.basket.question"),
      t(messages, "landing.faq.basket.answer"),
    ],
    [
      t(messages, "landing.faq.cancel.question"),
      t(messages, "landing.faq.cancel.answer"),
    ],
    [
      t(messages, "landing.faq.payout.question"),
      t(messages, "landing.faq.payout.answer"),
    ],
  ];

  return (
    <section className="landing-faq" id="faq" aria-labelledby="faq-title">
      <div>
        <h2 id="faq-title">{t(messages, "landing.faq.title")}</h2>
        <p>{t(messages, "landing.faq.intro")}</p>
      </div>
      <div className="landing-questions">
        {questions.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
