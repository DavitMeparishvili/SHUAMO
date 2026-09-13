import type { ReactNode } from "react";
import Link from "next/link";
import type { Locale } from "@/src/modules/localization";
import type { PerformanceReport } from "../ports/performance";
import type { PerformancePageState } from "../application/performance-query";
import type { HomeProduct } from "./workspace-overview";
import { DashboardCopy } from "./workspace-overview-copy";
import { InsightFilters } from "./insight-controls";
import { InsightChart } from "./insight-chart";
import {
  InsightMetrics,
  InsightRanking,
  InsightCancellation,
  InsightImage,
  insightText,
  insightDate,
  gel,
} from "./insight-shared";
import { performanceHref } from "./performance-links";

export function WorkspaceOverview({
  locale,
  name,
  report,
  products,
  state,
  finance,
}: {
  locale: Locale;
  name: string;
  report: PerformanceReport;
  products: HomeProduct[];
  discover: HomeProduct[];
  state?: PerformancePageState;
  finance?: ReactNode;
}) {
  const text = insightText(locale),
    brand = report.role === "brand",
    root = `/${locale}/${report.role}`,
    basePath = `${root}/${brand ? "performance" : "earnings"}`;
  const selected =
    state ??
    ({
      filters: { period: "30d" },
      metric: "earnings",
      breakdown: brand ? "creators" : "products",
    } satisfies PerformancePageState);
  const context = report.context;
  return (
    <div className="workspace-content insights-workspace insight-overview">
      <header className="insight-overview-heading">
        <div>
          <h1>
            {brand
              ? text("Your brand overview", "თქვენი ბრენდის მიმოხილვა")
              : `${text("Hello", "გამარჯობა")}, ${name}!`}
          </h1>
          <p>
            {brand
              ? `${name} · ${text("See what your creator partnerships generate.", "ნახეთ კრეატორებთან თანამშრომლობის შედეგები.")}`
              : text(
                  "Your earnings, your next steps, all in one place.",
                  "თქვენი შემოსავალი და შემდეგი ნაბიჯები ერთ სივრცეში.",
                )}
          </p>
        </div>
        <InsightFilters
          key={JSON.stringify(selected.filters)}
          overview
          report={report}
          state={selected}
          basePath={root}
          locale={locale}
        />
      </header>
      {finance}
      <InsightMetrics
        overview
        report={report}
        state={selected}
        basePath={basePath}
        locale={locale}
      />
      {brand ? (
        <div className="insight-action-banner">
          <div>
            <strong>
              {context?.pending ?? 0}{" "}
              {text(
                "creator applications need review",
                "კრეატორის განაცხადი განსახილველია",
              )}
            </strong>
            <p>
              {text(
                "Find the next creators for your catalogue.",
                "შეარჩიეთ კრეატორები თქვენი კატალოგისთვის.",
              )}
            </p>
          </div>
          <Link className="x-button" href={`${root}/creators?status=PENDING`}>
            {text("Review applications", "განაცხადების განხილვა")} →
          </Link>
          {context ? (
            <Link
              className="insight-secondary-action"
              href={`${root}/creators?status=APPROVED&activation=no-link`}
            >
              {context.approved - context.withLink}{" "}
              {text(
                "approved creators have no link",
                "დამტკიცებულ კრეატორს ბმული არ აქვს",
              )}
            </Link>
          ) : null}
        </div>
      ) : null}
      <div className="insight-two-columns">
        <InsightChart
          report={report}
          state={selected}
          basePath={basePath}
          locale={locale}
        />
        {brand ? (
          <section className="insight-panel insight-activation">
            <header>
              <h2>
                {text("Partnership activation", "პარტნიორების აქტივაცია")}
              </h2>
              <p>
                {text(
                  "Current approved partners · lifetime activity",
                  "მიმდინარე დამტკიცებული პარტნიორები · სრული ისტორია",
                )}
              </p>
            </header>
            {context?.approved ? (
              [
                [text("Approved", "დამტკიცებული"), context.approved, ""],
                [
                  text("Created a link", "შექმნა ბმული"),
                  context.withLink,
                  "has-link",
                ],
                [
                  text(
                    "Generated a confirmed sale",
                    "მოიტანა დადასტურებული გაყიდვა",
                  ),
                  context.withSale,
                  "has-sale",
                ],
              ].map(([label, n, activation]) => (
                <Link
                  className="insight-activation-row"
                  key={label}
                  href={`${root}/creators?status=APPROVED${activation ? `&activation=${activation}` : ""}`}
                >
                  <span>
                    {label}
                    <strong>
                      {n} / {context.approved}
                    </strong>
                  </span>
                  <span className="insight-bar">
                    <span
                      style={{
                        width: `${(Number(n) / context.approved) * 100}%`,
                      }}
                    />
                  </span>
                </Link>
              ))
            ) : (
              <div className="insight-empty">
                <p>
                  {text(
                    "Approved partnerships will appear here.",
                    "დამტკიცებული პარტნიორები აქ გამოჩნდება.",
                  )}
                </p>
              </div>
            )}
          </section>
        ) : (
          <section className="insight-panel insight-next-steps">
            <header>
              <h2>{text("Your next steps", "თქვენი შემდეგი ნაბიჯები")}</h2>
              <p>
                {text(
                  "Keep your next promotion moving.",
                  "მოამზადეთ თქვენი შემდეგი პრომოცია.",
                )}
              </p>
            </header>
            <Link
              className="insight-next-step"
              href={`${root}/brands?status=APPROVED`}
            >
              <span className="insight-step-icon">→</span>
              <div>
                <strong>
                  {context?.approved
                    ? `${context.approved} ${text("brands ready to work with you", "ბრენდი მზადაა თანამშრომლობისთვის")}`
                    : text(
                        "Find your first brand partner",
                        "იპოვეთ პირველი პარტნიორი ბრენდი",
                      )}
                </strong>
                <p>
                  {text(
                    "Browse a catalogue and choose your next product.",
                    "ნახეთ კატალოგი და აირჩიეთ პროდუქტი.",
                  )}
                </p>
                <span>{text("Browse brands", "ბრენდების ნახვა")} →</span>
              </div>
            </Link>
            {context?.pending ? (
              <Link
                className="insight-next-step"
                href={`${root}/brands?status=PENDING`}
              >
                <span className="insight-step-icon">→</span>
                <div>
                  <strong>
                    {context.pending}{" "}
                    {text(
                      "brand applications pending",
                      "ბრენდის განაცხადი მოლოდინშია",
                    )}
                  </strong>
                  <span>
                    {text("View applications", "განაცხადების ნახვა")} →
                  </span>
                </div>
              </Link>
            ) : null}
            <Link className="insight-next-step" href={`${root}/profile`}>
              <span className="insight-step-icon">→</span>
              <div>
                <strong>
                  {context?.profilePublished
                    ? text(
                        "Your profile is published",
                        "თქვენი პროფილი გამოქვეყნებულია",
                      )
                    : text("Your profile is private", "თქვენი პროფილი პირადია")}
                </strong>
                <p>
                  {context?.profilePublished
                    ? text(
                        "Keep your work and social links up to date.",
                        "განაახლეთ ნამუშევრები და სოციალური ბმულები.",
                      )
                    : text(
                        "Preview your profile, then publish when ready.",
                        "გადახედეთ პროფილს და გამოაქვეყნეთ, როცა მზად იქნებით.",
                      )}
                </p>
                <span>{text("Preview profile", "პროფილის გადახედვა")} →</span>
              </div>
            </Link>
          </section>
        )}
      </div>
      <div className="insight-two-columns">
        <InsightRanking
          report={report}
          state={selected}
          basePath={basePath}
          locale={locale}
          kind={brand ? "creators" : "products"}
        />
        {brand ? (
          <section className="insight-panel">
            <header>
              <h2>{text("Catalogue at a glance", "კატალოგის მიმოხილვა")}</h2>
              <p>
                {text(
                  "Keep your products ready for promotion.",
                  "მოამზადეთ პროდუქტები პრომოციისთვის.",
                )}
              </p>
            </header>
            {products.map((p) => (
              <Link
                key={p.id}
                className="insight-product-row"
                href={`${root}/products/${p.id}`}
              >
                <InsightImage
                  {...(p.imageUrl ? { src: p.imageUrl } : {})}
                  name={p.title}
                />
                <div>
                  <strong>{p.title}</strong>
                  <small>{gel(p.price, locale)}</small>
                </div>
                <span>→</span>
              </Link>
            ))}
            <Link className="insight-panel-footer" href={`${root}/products`}>
              {text("Manage products", "პროდუქტების მართვა")} →
            </Link>
          </section>
        ) : (
          <section className="insight-panel">
            <header>
              <h2>{text("Ready to share", "მზადაა გასაზიარებლად")}</h2>
              <p>
                {text(
                  "Your working links with accepted terms.",
                  "თქვენი მოქმედი ბმულები მიღებული პირობებით.",
                )}
              </p>
            </header>
            {products.length ? (
              products.map((p) => (
                <div key={p.linkId ?? p.id} className="insight-product-row">
                  <InsightImage
                    {...(p.imageUrl ? { src: p.imageUrl } : {})}
                    name={p.title}
                  />
                  <div>
                    <Link href={`${root}/products/${p.id}`}>
                      <strong>{p.title}</strong>
                    </Link>
                    <small>{p.brandName}</small>
                  </div>
                  {p.linkUrl ? (
                    <DashboardCopy url={p.linkUrl} locale={locale} />
                  ) : null}
                </div>
              ))
            ) : (
              <div className="insight-empty">
                <p>
                  {text(
                    "Choose a product from an approved brand to create your first link.",
                    "აირჩიეთ პროდუქტი დამტკიცებული ბრენდისგან პირველი ბმულის შესაქმნელად.",
                  )}
                </p>
                <Link href={`${root}/brands`}>
                  {text("Browse brands", "ბრენდების ნახვა")}
                </Link>
              </div>
            )}
            <Link className="insight-panel-footer" href={`${root}/links`}>
              {text("All my links", "ჩემი ყველა ბმული")} →
            </Link>
          </section>
        )}
      </div>
      {report.totals.cancelledSales ? (
        <InsightCancellation
          report={report}
          state={selected}
          basePath={basePath}
          locale={locale}
        />
      ) : null}
      <section className="insight-panel insight-recent">
        <header className="insight-panel-heading">
          <div>
            <h2>{text("Commission activity", "საკომისიოს ცვლილებები")}</h2>
            <p>
              {text(
                "Issued and reversed by event date.",
                "ნახეთ დარიცხული საკომისიო და ცვლილებები.",
              )}
            </p>
          </div>
          <Link
            href={performanceHref(basePath, selected.filters, selected, {
              tab: "sales",
            })}
          >
            {text("View all sales", "ყველა გაყიდვა")} →
          </Link>
        </header>
        {(report.activity ?? []).slice(0, 3).map((event) => (
          <Link
            className="insight-recent-row"
            key={`${event.saleId}-${event.kind}`}
            href={performanceHref(basePath, selected.filters, selected, {
              tab: "sales",
              sale: event.saleId,
            })}
          >
            <div>
              <strong>{event.productTitle}</strong>
              <small>
                {event.partnerName} · {insightDate(event.at, locale)}
              </small>
            </div>
            <span
              className={`insight-status ${event.kind === "reversed" ? "cancelled" : "confirmed"}`}
            >
              {event.kind === "reversed"
                ? text("Commission reversed", "საკომისიო გაუქმდა")
                : text("Commission issued", "საკომისიო დაირიცხა")}
            </span>
            <strong>
              {event.kind === "reversed" ? "−" : "+"}
              {gel(event.amount, locale)}
            </strong>
            <span>→</span>
          </Link>
        ))}
        {!report.activity?.length ? (
          <p className="insight-empty">
            {text(
              "No commission activity in this period.",
              "ამ პერიოდში საკომისიოს ცვლილებები არ არის.",
            )}
          </p>
        ) : null}
      </section>
      <p className="insight-freshness">
        {text("Updated", "განახლებულია")}{" "}
        {insightDate(report.generatedAt, locale)} · Asia/Tbilisi
      </p>
    </div>
  );
}
