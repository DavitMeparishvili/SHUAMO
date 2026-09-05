import Link from "next/link";
import type { Locale, Messages } from "@/src/modules/localization";
import type { PerformanceReport } from "../ports/performance";
import type { PerformancePageState } from "../application/performance-query";
import { performanceHref } from "./performance-links";
import { InsightFilters } from "./insight-controls";
import { InsightChart } from "./insight-chart";
import {
  InsightMetrics,
  InsightRanking,
  InsightCancellation,
  InsightSaleDetail,
  InsightImage,
  insightText,
  insightDate,
  gel,
} from "./insight-shared";

export function PerformanceDashboard({
  report,
  state,
  locale,
  basePath,
}: {
  report: PerformanceReport;
  state: PerformancePageState;
  locale: Locale;
  messages: Messages;
  basePath: string;
}) {
  const text = insightText(locale),
    tab = state.filters.tab ?? "summary";
  const href = (updates: Record<string, string | number | undefined> = {}) =>
    performanceHref(basePath, state.filters, state, {
      sale: undefined,
      ...updates,
    });
  const kinds =
    report.role === "creator"
      ? (["brands", "products", "links"] as const)
      : (["creators", "products", "links"] as const);
  const labels = {
    brands: text("Brands", "ბრენდები"),
    creators: text("Creators", "კრეატორები"),
    products: text("Products", "პროდუქტები"),
    links: text("Tracking links", "ბმულები"),
  };
  const rows = report.breakdowns[state.breakdown];
  const page = Math.min(
    state.filters.breakdownPage ?? 1,
    Math.max(1, Math.ceil(rows.length / 10)),
  );
  return (
    <div
      className="insights-workspace"
      data-performance-workspace="xurjin-analytics"
    >
      <InsightFilters
        key={href()}
        report={report}
        state={state}
        basePath={basePath}
        locale={locale}
      />
      <nav
        className="insight-tabs"
        aria-label={text("Performance views", "შედეგების ხედები")}
      >
        {(["summary", "sales", "activity"] as const).map((t) => (
          <Link
            key={t}
            aria-current={tab === t ? "page" : undefined}
            href={href({
              tab: t,
              linkStatus:
                t === "activity" ? state.filters.linkStatus : undefined,
              status: t === "sales" ? state.filters.status : undefined,
              q: undefined,
              ledgerPage: undefined,
              clickPage: undefined,
            })}
          >
            {t === "summary"
              ? text("Summary", "შეჯამება")
              : t === "sales"
                ? text("Sales & commission", "გაყიდვები და საკომისიო")
                : text("Link activity", "ბმულების აქტივობა")}
          </Link>
        ))}
      </nav>
      <InsightMetrics
        report={report}
        state={state}
        basePath={basePath}
        locale={locale}
      />
      <p className="insight-freshness">
        {text(
          "Source sale dates · current sale status",
          "გაყიდვის თარიღები · მიმდინარე სტატუსი",
        )}{" "}
        · {text("Updated", "განახლებულია")}{" "}
        {insightDate(report.generatedAt, locale)} · Asia/Tbilisi
      </p>
      {tab === "summary" ? (
        <>
          <div className="insight-two-columns">
            <InsightChart
              report={report}
              state={state}
              basePath={basePath}
              locale={locale}
            />
            <InsightRanking
              report={report}
              state={state}
              basePath={basePath}
              locale={locale}
              kind={report.role === "creator" ? "products" : "creators"}
            />
          </div>
          <section className="insight-panel" id="breakdown">
            <header className="insight-panel-heading">
              <div>
                <h2>{text("Performance breakdown", "შედეგების დეტალები")}</h2>
                <p>
                  {text(
                    "Explore partners, products and accepted links.",
                    "პარტნიორების, პროდუქტების და ბმულების შედეგები.",
                  )}
                </p>
              </div>
              <nav
                className="insight-tabs compact"
                aria-label={text("Breakdown", "დაჯგუფება")}
              >
                {kinds.map((kind) => (
                  <Link
                    key={kind}
                    aria-current={state.breakdown === kind ? "page" : undefined}
                    href={href({ view: kind, breakdownPage: undefined })}
                  >
                    {labels[kind]}
                  </Link>
                ))}
              </nav>
            </header>
            {rows.length ? (
              <div className="insight-breakdown">
                <div className="insight-table-head">
                  <span>{labels[state.breakdown]}</span>
                  <span>
                    {text("Confirmed sales", "დადასტურებული გაყიდვები")}
                  </span>
                  <span>
                    {report.role === "brand"
                      ? text("Sales value", "გაყიდვების ღირებულება")
                      : text("Clicks", "დაწკაპუნებები")}
                  </span>
                  <span>{text("Net commission", "წმინდა საკომისიო")}</span>
                  <span />
                </div>
                {rows.slice((page - 1) * 10, page * 10).map((row) => {
                  const key =
                    state.breakdown === "brands"
                      ? "brand"
                      : state.breakdown === "creators"
                        ? "creator"
                        : state.breakdown === "products"
                          ? "product"
                          : "link";
                  return (
                    <Link
                      className="insight-data-row"
                      key={row.id}
                      href={href({
                        [key]: row.id,
                        tab: state.breakdown === "links" ? "sales" : "summary",
                        view:
                          state.breakdown === "links"
                            ? "links"
                            : state.breakdown === "products"
                              ? "links"
                              : "products",
                        ...(state.breakdown !== "links"
                          ? { link: undefined }
                          : {}),
                        ...(state.breakdown === "brands" ||
                        state.breakdown === "creators"
                          ? { product: undefined }
                          : {}),
                        ledgerPage: undefined,
                        breakdownPage: undefined,
                      })}
                    >
                      <div className="insight-entity">
                        <InsightImage
                          {...(state.breakdown === "products" && row.imageUrl
                            ? { src: row.imageUrl }
                            : {})}
                          name={row.label}
                        />
                        <div>
                          <strong>{row.label}</strong>
                          {row.detail ? <small>{row.detail}</small> : null}
                          {row.status ? (
                            <small>
                              {row.status === "ACTIVE"
                                ? text("Active link", "აქტიური ბმული")
                                : text(
                                    "Currently unavailable",
                                    "ამჟამად მიუწვდომელია",
                                  )}
                            </small>
                          ) : null}
                        </div>
                      </div>
                      <span
                        data-label={text(
                          "Confirmed sales",
                          "დადასტურებული გაყიდვები",
                        )}
                      >
                        {row.confirmedSales ?? row.orders}
                      </span>
                      <span
                        data-label={
                          report.role === "brand"
                            ? text("Sales value", "გაყიდვების ღირებულება")
                            : text("Clicks", "დაწკაპუნებები")
                        }
                      >
                        {report.role === "brand"
                          ? gel(row.sales, locale)
                          : row.clicks}
                      </span>
                      <strong
                        data-label={text("Net commission", "წმინდა საკომისიო")}
                      >
                        {gel(row.confirmed, locale)}
                      </strong>
                      <span className="insight-row-action">
                        {state.breakdown === "links"
                          ? text("View sales", "გაყიდვები")
                          : state.breakdown === "products"
                            ? text("View links", "ბმულები")
                            : text("View products", "პროდუქტები")}{" "}
                        →
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="insight-empty">
                <h3>
                  {text("No matching results", "შესაბამისი შედეგები არ არის")}
                </h3>
                <a href={basePath}>
                  {text("Clear filters", "ფილტრების გასუფთავება")}
                </a>
              </div>
            )}
            {rows.length > 10 ? (
              <nav className="insight-pagination">
                {page > 1 ? (
                  <Link href={href({ breakdownPage: page - 1 })}>
                    {text("Previous", "წინა")}
                  </Link>
                ) : (
                  <span />
                )}
                <span>
                  {page} / {Math.ceil(rows.length / 10)}
                </span>
                {page < Math.ceil(rows.length / 10) ? (
                  <Link href={href({ breakdownPage: page + 1 })}>
                    {text("Next", "შემდეგი")}
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </section>
          <InsightCancellation
            report={report}
            state={state}
            basePath={basePath}
            locale={locale}
          />
        </>
      ) : null}
      {tab === "sales" ? (
        <section className="insight-panel" id="earnings-ledger">
          <header className="insight-panel-heading">
            <div>
              <h2>{text("Sales & commission", "გაყიდვები და საკომისიო")}</h2>
              <p>
                {text(
                  "One attributed product sale per row.",
                  "თითო ჩანაწერი — ერთი პროდუქტის მიკუთვნებული გაყიდვა.",
                )}
              </p>
            </div>
            <a
              className="x-button outline"
              href={href().replace(basePath, "/api/performance/export")}
            >
              {text("Export CSV", "CSV ექსპორტი")}
            </a>
          </header>
          {report.role === "brand" ? (
            <Link
              className="insight-panel-footer"
              href={`/${locale}/brand/orders/source`}
            >
              {text("Manage source orders", "წყაროს შეკვეთების მართვა")} →
            </Link>
          ) : null}
          <p className="insight-freshness">
            {text(
              "Cards show the full date and partner scope. Search and status narrow the sales below.",
              "ბარათები აჩვენებს არჩეულ პერიოდსა და პარტნიორებს. ძიება და სტატუსი აზუსტებს ქვემოთ მოცემულ გაყიდვებს.",
            )}
          </p>
          <form className="insight-sales-search" action={basePath}>
            {[...new URL(href(), "http://localhost").searchParams]
              .filter(
                ([k]) => !["q", "status", "ledgerPage", "tab"].includes(k),
              )
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <input type="hidden" name="tab" value="sales" />
            <label>
              <span className="sr-only">
                {text("Search sales", "გაყიდვების ძიება")}
              </span>
              <input
                name="q"
                defaultValue={state.filters.ledgerQuery}
                placeholder={text(
                  "Search product, partner or reference…",
                  "პროდუქტი, პარტნიორი ან მითითება…",
                )}
              />
            </label>
            <label>
              <span className="sr-only">
                {text("Sale status", "გაყიდვის სტატუსი")}
              </span>
              <select name="status" defaultValue={state.filters.status ?? ""}>
                <option value="">
                  {text("All statuses", "ყველა სტატუსი")}
                </option>
                <option value="CONFIRMED">
                  {text("Confirmed", "დადასტურებული")}
                </option>
                <option value="CANCELLED">
                  {text("Cancelled", "გაუქმებული")}
                </option>
              </select>
            </label>
            <button className="x-button" type="submit">
              {text("Search", "ძიება")}
            </button>
          </form>
          <div className="insight-sales-list">
            {report.ledger.rows.length ? (
              report.ledger.rows.map((row) => (
                <Link
                  className="insight-sale-row"
                  key={row.id}
                  href={href({ sale: row.id })}
                  scroll={false}
                >
                  <div>
                    <strong>{row.productTitle}</strong>
                    <small>
                      {report.role === "creator"
                        ? row.brandName
                        : row.creatorName}{" "}
                      · {row.orderId}
                    </small>
                  </div>
                  <time>{insightDate(row.occurredAt, locale)}</time>
                  <span
                    className={`insight-status ${row.status.toLowerCase()}`}
                  >
                    {row.status === "CANCELLED"
                      ? text("Cancelled", "გაუქმებული")
                      : text("Confirmed", "დადასტურებული")}
                  </span>
                  <span data-label={text("Sale value", "გაყიდვის ღირებულება")}>
                    {gel(row.commissionableNet, locale)}
                  </span>
                  <strong
                    data-label={text("Net commission", "წმინდა საკომისიო")}
                  >
                    {gel(
                      row.status === "CANCELLED" ? "0" : row.commissionAmount,
                      locale,
                    )}
                  </strong>
                  <span>→</span>
                </Link>
              ))
            ) : (
              <div className="insight-empty">
                <h3>
                  {text(
                    "No sales match these filters",
                    "ამ ფილტრებით გაყიდვები არ მოიძებნა",
                  )}
                </h3>
                <a
                  href={href({
                    q: undefined,
                    status: undefined,
                    ledgerPage: undefined,
                  })}
                >
                  {text(
                    "Clear search and status",
                    "ძიების და სტატუსის გასუფთავება",
                  )}
                </a>
              </div>
            )}
          </div>
          <nav className="insight-pagination">
            {report.ledger.page > 1 ? (
              <Link href={href({ ledgerPage: report.ledger.page - 1 })}>
                {text("Previous", "წინა")}
              </Link>
            ) : (
              <span />
            )}
            <span>
              {report.ledger.total} {text("sales", "გაყიდვა")} ·{" "}
              {report.ledger.page} / {report.ledger.pageCount}
            </span>
            {report.ledger.page < report.ledger.pageCount ? (
              <Link href={href({ ledgerPage: report.ledger.page + 1 })}>
                {text("Next", "შემდეგი")}
              </Link>
            ) : null}
          </nav>
        </section>
      ) : null}
      {tab === "activity" ? (
        <section className="insight-panel" id="click-ledger">
          <header>
            <h2>{text("Link activity", "ბმულების აქტივობა")}</h2>
            <p>
              {text(
                "Clicks use visit dates; sales use sale dates.",
                "დაწკაპუნებები ვიზიტის თარიღით ითვლება; გაყიდვები — გაყიდვის თარიღით.",
              )}
            </p>
          </header>
          <div className="insight-click-total">
            <strong>{report.totals.clicks}</strong>{" "}
            {text("recorded clicks", "დაფიქსირებული დაწკაპუნება")}
          </div>
          {report.clickLedger.rows.length ? (
            report.clickLedger.rows.map((row) => (
              <div className="insight-click-row" key={row.id}>
                <div>
                  <strong>{row.productTitle}</strong>
                  <small>
                    {row.brandName} · {row.creatorName}
                  </small>
                </div>
                <time>{insightDate(row.occurredAt, locale)}</time>
                <span>
                  {row.orderIds.length
                    ? row.orderIds.join(", ")
                    : text(
                        "No attributed sale in this period",
                        "ამ პერიოდში მიკუთვნებული გაყიდვა არ არის",
                      )}
                </span>
                <details>
                  <summary>
                    {text(
                      "Link & click details",
                      "ბმულის და დაწკაპუნების დეტალები",
                    )}
                  </summary>
                  <p>{row.linkCode}</p>
                  <p>{row.id}</p>
                </details>
              </div>
            ))
          ) : (
            <div className="insight-empty">
              <h3>
                {text(
                  "No clicks in this period",
                  "ამ პერიოდში დაწკაპუნებები არ არის",
                )}
              </h3>
              <p>
                {text(
                  "Share a working tracking link to start recording visits.",
                  "გააზიარეთ მოქმედი ბმული ვიზიტების დასაფიქსირებლად.",
                )}
              </p>
            </div>
          )}
          <nav className="insight-pagination">
            {report.clickLedger.page > 1 ? (
              <Link href={href({ clickPage: report.clickLedger.page - 1 })}>
                {text("Previous", "წინა")}
              </Link>
            ) : (
              <span />
            )}
            <span>
              {report.clickLedger.total} {text("clicks", "დაწკაპუნება")}
            </span>
            {report.clickLedger.page < report.clickLedger.pageCount ? (
              <Link href={href({ clickPage: report.clickLedger.page + 1 })}>
                {text("Next", "შემდეგი")}
              </Link>
            ) : null}
          </nav>
        </section>
      ) : null}
      {state.filters.saleId && !report.sale ? (
        <div className="insight-empty" role="status">
          {text("This sale is unavailable.", "ეს გაყიდვა მიუწვდომელია.")}{" "}
          <Link href={href()}>
            {text("Back to results", "შედეგებზე დაბრუნება")}
          </Link>
        </div>
      ) : null}
      {report.sale ? (
        <InsightSaleDetail
          sale={report.sale}
          state={state}
          basePath={basePath}
          locale={locale}
        />
      ) : null}
    </div>
  );
}
