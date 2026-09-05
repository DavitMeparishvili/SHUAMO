import Link from "next/link";
import Image from "next/image";
import Decimal from "decimal.js";
import { Icon, type IconName } from "@/src/modules/design-system";
import type {
  PerformanceBreakdownKind,
  PerformanceReport,
  SaleDetail,
} from "../ports/performance";
import type { PerformancePageState } from "../application/performance-query";
import { performanceHref } from "./performance-links";
import { SalePanel } from "./insight-controls";

export const insightText = (locale: string) => (en: string, ka: string) =>
  locale === "ka" ? ka : en;
export const gel = (amount: string | number, locale: string) =>
  `${new Intl.NumberFormat(locale === "ka" ? "ka-GE" : "en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount))} ₾`;
export const insightDate = (date: string, locale: string) =>
  new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : "en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tbilisi",
  }).format(new Date(date));
export function InsightImage({ src, name }: { src?: string; name: string }) {
  return (
    <span className="insight-image">
      {src ? (
        <Image src={src} alt="" width={48} height={48} unoptimized />
      ) : (
        <span>{name.slice(0, 1)}</span>
      )}
    </span>
  );
}

export function InsightMetrics({
  report,
  state,
  basePath,
  locale,
  overview = false,
}: {
  report: PerformanceReport;
  state: PerformancePageState;
  basePath: string;
  locale: string;
  overview?: boolean;
}) {
  const text = insightText(locale),
    total = report.summaryTotals ?? report.totals;
  const issued = new Decimal(total.confirmed).plus(total.cancelled).toFixed(2);
  const href = (updates: Record<string, string | undefined>) =>
    performanceHref(basePath, state.filters, state, {
      tab: "sales",
      sale: undefined,
      ledgerPage: undefined,
      q: undefined,
      ...updates,
    });
  const reconciliation = `${text("Issued", "დარიცხული")} ${gel(issued, locale)} · ${text("Reversed", "გაუქმებული")} ${gel(total.cancelled, locale)}`;
  const items: {
    label: string;
    value: string;
    note: string;
    href: string;
    icon: IconName;
    tone: string;
  }[] = [];
  if (report.role === "brand")
    items.push({
      label: text(
        "Confirmed attributed sales",
        "დადასტურებული გაყიდვების ღირებულება",
      ),
      value: gel(total.sales, locale),
      note: text(
        "After discounts and reported VAT; excludes shipping",
        "ფასდაკლებისა და დღგ-ის შემდეგ; მიტანის გარეშე",
      ),
      href: href({ status: "CONFIRMED" }),
      icon: "cart",
      tone: "green",
    });
  items.push({
    label:
      report.role === "creator"
        ? text("Net earned commission", "წმინდა გამომუშავებული საკომისიო")
        : text("Net creator commission", "კრეატორების წმინდა საკომისიო"),
    value: gel(total.confirmed, locale),
    note: reconciliation,
    href: href({ status: undefined }),
    icon: "wallet",
    tone: "green",
  });
  if (!overview && report.role === "creator")
    items.push(
      {
        label: text("Issued commission", "დარიცხული საკომისიო"),
        value: gel(issued, locale),
        note: text("Before reversals", "გაუქმებამდე"),
        href: href({ status: undefined }),
        icon: "box",
        tone: "blue",
      },
      {
        label: text("Reversed commission", "გაუქმებული საკომისიო"),
        value: gel(total.cancelled, locale),
        note: `${total.cancelledSales ?? 0} ${text("cancelled sales", "გაუქმებული გაყიდვა")}`,
        href: href({ status: "CANCELLED" }),
        icon: "close",
        tone: "red",
      },
    );
  items.push({
    label: text("Confirmed sales", "დადასტურებული გაყიდვები"),
    value: String(total.confirmedSales ?? total.orders),
    note: `${total.orders} ${text("total", "სულ")} · ${total.cancelledSales ?? 0} ${text("cancelled", "გაუქმებული")}`,
    href: href({ status: "CONFIRMED" }),
    icon: "cart",
    tone: "blue",
  });
  if (overview && report.role === "creator")
    items.push({
      label: text("Link clicks", "ბმულზე დაწკაპუნებები"),
      value: String(total.clicks),
      note: text("Recorded in this period", "ამ პერიოდში დაფიქსირებული"),
      href: href({ tab: "activity", status: undefined }),
      icon: "link",
      tone: "blue",
    });
  if (report.role === "brand")
    items.push({
      label: text("Reversed commission", "გაუქმებული საკომისიო"),
      value: gel(total.cancelled, locale),
      note: `${total.cancelledSales ?? 0} ${text("cancelled sales", "გაუქმებული გაყიდვა")}`,
      href: href({ status: "CANCELLED" }),
      icon: "close",
      tone: "red",
    });
  return (
    <div className={`insight-metrics ${items.length === 3 ? "three" : "four"}`}>
      {items.map((item) => (
        <Link href={item.href} key={item.label} className="insight-metric">
          <span className={`insight-metric-icon ${item.tone}`}>
            <Icon name={item.icon} />
          </span>
          <div>
            <span className="insight-metric-label">{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function InsightRanking({
  report,
  state,
  basePath,
  locale,
  kind,
}: {
  report: PerformanceReport;
  state: PerformancePageState;
  basePath: string;
  locale: string;
  kind: PerformanceBreakdownKind;
}) {
  const text = insightText(locale),
    metric = report.role === "creator" ? "confirmed" : "sales";
  const rows = [...report.breakdowns[kind]]
    .filter((r) => Number(r[metric]) > 0)
    .sort((a, b) => new Decimal(b[metric]).comparedTo(a[metric]))
    .slice(0, 5);
  const max = Math.max(1, ...rows.map((r) => Number(r[metric])));
  const title =
    kind === "creators"
      ? text("Creators driving sales", "გაყიდვების მომტანი კრეატორები")
      : text("Products earning for you", "შემოსავლის მომტანი პროდუქტები");
  return (
    <section className="insight-panel insight-ranking">
      <header>
        <h2>{title}</h2>
        <p>
          {report.role === "creator"
            ? text(
                "Ranked by net earned commission",
                "წმინდა საკომისიოს მიხედვით",
              )
            : text(
                "Ranked by confirmed sales value",
                "დადასტურებული გაყიდვების ღირებულებით",
              )}
        </p>
      </header>
      {rows.length ? (
        <div className="insight-ranks">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={performanceHref(basePath, state.filters, state, {
                [kind === "creators" ? "creator" : "product"]: r.id,
                view: kind === "products" ? "links" : "products",
                tab: "summary",
                link: undefined,
                ledgerPage: undefined,
              })}
              className="insight-rank"
            >
              <InsightImage
                {...(kind === "products" && r.imageUrl
                  ? { src: r.imageUrl }
                  : {})}
                name={r.label}
              />
              <div>
                <div className="insight-rank-title">
                  <span>{r.label}</span>
                  <strong>{gel(r[metric], locale)}</strong>
                </div>
                <div className="insight-bar">
                  <span
                    style={{ width: `${(Number(r[metric]) / max) * 100}%` }}
                  />
                </div>
                <small>
                  {r.confirmedSales ?? r.orders}{" "}
                  {text("confirmed sales", "დადასტურებული გაყიდვა")}
                  {report.role === "brand"
                    ? ` · ${gel(r.confirmed, locale)} ${text("commission", "საკომისიო")}`
                    : ""}
                </small>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="insight-empty">
          <p>
            {text(
              "Your first confirmed sale will appear here.",
              "პირველი დადასტურებული გაყიდვა აქ გამოჩნდება.",
            )}
          </p>
        </div>
      )}
    </section>
  );
}

export function InsightCancellation({
  report,
  state,
  basePath,
  locale,
}: {
  report: PerformanceReport;
  state: PerformancePageState;
  basePath: string;
  locale: string;
}) {
  const text = insightText(locale);
  return (
    <aside className="insight-cancellation">
      <div>
        <h2>{text("Cancellation impact", "გაუქმების გავლენა")}</h2>
        <p>
          {report.totals.cancelledSales ?? 0}{" "}
          {text("cancelled sales", "გაუქმებული გაყიდვა")} ·{" "}
          <strong>{gel(report.totals.cancelled, locale)}</strong>{" "}
          {text("commission reversed", "გაუქმებული საკომისიო")}
        </p>
      </div>
      <Link
        className="x-button outline"
        href={performanceHref(basePath, state.filters, state, {
          tab: "sales",
          status: "CANCELLED",
          sale: undefined,
          ledgerPage: undefined,
        })}
      >
        {text("View affected sales", "გაუქმებული გაყიდვები")} →
      </Link>
    </aside>
  );
}

export function InsightSaleDetail({
  sale,
  basePath,
  state,
  locale,
}: {
  sale: SaleDetail;
  basePath: string;
  state: PerformancePageState;
  locale: string;
}) {
  const text = insightText(locale),
    cancelled = sale.status === "CANCELLED";
  const close = performanceHref(basePath, state.filters, state, {
    sale: undefined,
    tab: "sales",
  });
  const productHref = `/${locale}/${basePath.includes("/brand/") ? "brand" : "creator"}/products/${sale.productId}`;
  const terms =
    sale.commissionType === "FIXED"
      ? `${gel(sale.commissionValue, locale)} ${text("per unit", "ერთეულზე")}`
      : `${new Decimal(sale.commissionValue).times(100).toString()}%`;
  return (
    <SalePanel
      title={text("Sale details", "გაყიდვის დეტალები")}
      closeHref={close}
      label={`← ${text("Back to sales", "გაყიდვებზე დაბრუნება")}`}
    >
      <div className="insight-sale-heading">
        <InsightImage
          {...(sale.imageUrl ? { src: sale.imageUrl } : {})}
          name={sale.productTitle}
        />
        <div>
          <h1>{sale.productTitle}</h1>
          <p>{sale.brandName}</p>
          <span
            className={`insight-status ${cancelled ? "cancelled" : "confirmed"}`}
          >
            {cancelled
              ? text("Cancelled", "გაუქმებული")
              : text("Confirmed", "დადასტურებული")}
          </span>
        </div>
      </div>
      <div className="insight-sale-net">
        <span>{text("Net commission", "წმინდა საკომისიო")}</span>
        <strong>{gel(cancelled ? "0" : sale.commissionAmount, locale)}</strong>
      </div>
      {cancelled ? (
        <p className="insight-sale-notice">
          {text(
            "This sale was cancelled and its commission was reversed.",
            "გაყიდვა და მისი საკომისიო გაუქმებულია.",
          )}
        </p>
      ) : null}
      <div className="insight-sale-amounts">
        <div>
          <span>{text("Issued commission", "დარიცხული საკომისიო")}</span>
          <strong>{gel(sale.commissionAmount, locale)}</strong>
        </div>
        <div>
          <span>{text("Reversed commission", "გაუქმებული საკომისიო")}</span>
          <strong>
            {gel(cancelled ? sale.commissionAmount : "0", locale)}
          </strong>
        </div>
      </div>
      <section>
        <h2>{text("Sale details", "გაყიდვის დეტალები")}</h2>
        <dl className="insight-detail-grid">
          <div>
            <dt>
              {text(
                "Attributed sale value",
                "მიკუთვნებული გაყიდვის ღირებულება",
              )}
            </dt>
            <dd>{gel(sale.commissionableNet, locale)}</dd>
          </div>
          <div>
            <dt>{text("Creator", "კრეატორი")}</dt>
            <dd>{sale.creatorName}</dd>
          </div>
          <div>
            <dt>{text("Brand", "ბრენდი")}</dt>
            <dd>{sale.brandName}</dd>
          </div>
          <div>
            <dt>{text("Source reference", "წყაროს მითითება")}</dt>
            <dd>{sale.orderId}</dd>
          </div>
          <div>
            <dt>{text("Recorded sale date", "გაყიდვის თარიღი")}</dt>
            <dd>{insightDate(sale.occurredAt, locale)}</dd>
          </div>
          <div>
            <dt>{text("Units", "ერთეულები")}</dt>
            <dd>{sale.quantity}</dd>
          </div>
        </dl>
      </section>
      <section>
        <h2>{text("Accepted link terms", "მიღებული ბმულის პირობები")}</h2>
        <dl className="insight-detail-grid">
          <div>
            <dt>{text("Commission", "საკომისიო")}</dt>
            <dd>{terms}</dd>
          </div>
          <div>
            <dt>{text("Attribution window", "ატრიბუციის პერიოდი")}</dt>
            <dd>
              {sale.cookieWindowDays !== undefined
                ? `${sale.cookieWindowDays} ${text("days", "დღე")}`
                : text("Not recorded", "არ არის დაფიქსირებული")}
            </dd>
          </div>
          <div>
            <dt>{text("Terms version", "პირობების ვერსია")}</dt>
            <dd>
              {sale.termsVersion ??
                text("Not recorded", "არ არის დაფიქსირებული")}
            </dd>
          </div>
          <div>
            <dt>{text("Accepted", "მიღებულია")}</dt>
            <dd>{insightDate(sale.termsAcceptedAt, locale)}</dd>
          </div>
        </dl>
        <p className="insight-detail-link">{sale.linkCode}</p>
        <div className="insight-sale-links">
          <Link
            className="x-button outline"
            href={performanceHref(basePath, state.filters, state, {
              sale: undefined,
              link: sale.linkId,
              view: "links",
              tab: "summary",
            })}
          >
            {text("View tracking link", "ბმულის შედეგები")}
          </Link>
          <Link className="x-button outline" href={productHref}>
            {text("View product", "პროდუქტის ნახვა")}
          </Link>
        </div>
      </section>
      <section>
        <h2>{text("Activity", "მოვლენები")}</h2>
        <ol className="insight-timeline">
          <li>
            <strong>
              {text("Attributed click", "მიკუთვნებული დაწკაპუნება")}
            </strong>
            <time>
              {sale.clickAt
                ? insightDate(sale.clickAt, locale)
                : text("Time not recorded", "დრო უცნობია")}
            </time>
            <small>{sale.clickId}</small>
          </li>
          <li>
            <strong>
              {text(
                "Sale confirmed · commission issued",
                "გაყიდვა დადასტურდა · საკომისიო დაირიცხა",
              )}
            </strong>
            <time>{insightDate(sale.confirmedAt, locale)}</time>
            <b>+{gel(sale.commissionAmount, locale)}</b>
          </li>
          {cancelled ? (
            <li className="cancelled">
              <strong>
                {text(
                  "Sale cancelled · commission reversed",
                  "გაყიდვა და საკომისიო გაუქმდა",
                )}
              </strong>
              <time>
                {sale.cancelledAt
                  ? insightDate(sale.cancelledAt, locale)
                  : text(
                      "Cancellation time not recorded",
                      "გაუქმების დრო არ არის დაფიქსირებული",
                    )}
              </time>
              <b>−{gel(sale.commissionAmount, locale)}</b>
            </li>
          ) : null}
        </ol>
      </section>
      <footer className="insight-sale-final">
        <span>
          {text("Current net commission", "მიმდინარე წმინდა საკომისიო")}
        </span>
        <strong>{gel(cancelled ? "0" : sale.commissionAmount, locale)}</strong>
      </footer>
    </SalePanel>
  );
}
