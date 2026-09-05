import Image from "next/image";
import Link from "next/link";
import Decimal from "decimal.js";
import { Icon, type IconName } from "@/src/modules/design-system";
import type { Locale } from "@/src/modules/localization";
import type { PerformanceReport } from "../ports/performance";
import { DashboardCopy } from "./workspace-overview-copy";

export interface HomeProduct {
  id: string;
  title: string;
  brandName: string;
  imageUrl?: string | undefined;
  price: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
  linkUrl?: string | undefined;
  linkId?: string | undefined;
}
export function ProductThumbnail({ src }: { src?: string | undefined }) {
  return (
    <span className="dashboard-product-image">
      {src ? (
        <Image src={src} alt="" fill sizes="120px" unoptimized />
      ) : (
        <Icon name="box" />
      )}
    </span>
  );
}

export function ProductDistribution({
  report,
  locale,
}: {
  report: PerformanceReport;
  locale: Locale;
}) {
  const text = (en: string, ka: string) => (locale === "ka" ? ka : en);
  const rows = report.breakdowns.products.filter((p) =>
    new Decimal(p.sales).greaterThan(0),
  );
  const total = rows.reduce((sum, r) => sum.plus(r.sales), new Decimal(0));
  const top = rows
    .slice(0, 4)
    .map((r) => ({ label: r.label, value: new Decimal(r.sales) }));
  const other = rows.slice(4).reduce((s, r) => s.plus(r.sales), new Decimal(0));
  if (other.gt(0)) top.push({ label: text("Other", "სხვა"), value: other });
  const colors = ["#3478ff", "#21b980", "#ffb82a", "#945aff", "#8196b8"];
  return (
    <section className="dashboard-panel distribution-panel">
      <h2>{text("Sales by product", "გაყიდვები პროდუქტების მიხედვით")}</h2>
      {total.eq(0) ? (
        <div className="distribution-empty">
          <Icon name="chart" />
          <p>
            {text(
              "Your sales breakdown will appear after the first attributed sale.",
              "გაყიდვების განაწილება გამოჩნდება პირველი მიკუთვნებული გაყიდვის შემდეგ.",
            )}
          </p>
        </div>
      ) : (
        <div className="distribution-content">
          <svg
            viewBox="0 0 160 160"
            role="img"
            aria-label={text(
              "Share of attributed sales by product",
              "მიკუთვნებული გაყიდვების წილი პროდუქტების მიხედვით",
            )}
          >
            {top.map((row, i) => {
              const pct = row.value.div(total).toNumber() * 100;
              const prior = top
                .slice(0, i)
                .reduce(
                  (sum, r) => sum + r.value.div(total).toNumber() * 100,
                  0,
                );
              return (
                <circle
                  key={row.label}
                  cx="80"
                  cy="80"
                  r="59"
                  fill="none"
                  stroke={colors[i]}
                  strokeWidth="26"
                  pathLength="100"
                  strokeDasharray={`${pct} ${100 - pct}`}
                  strokeDashoffset={-prior}
                  transform="rotate(-90 80 80)"
                ></circle>
              );
            })}
          </svg>
          <ul>
            {top.map((row, i) => (
              <li key={row.label}>
                <i style={{ background: colors[i] }} />
                <span>{row.label}</span>
                <strong>{row.value.div(total).times(100).toFixed(1)}%</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
function OverviewChart({
  report,
  locale,
}: {
  report: PerformanceReport;
  locale: Locale;
}) {
  const text = (en: string, ka: string) => (locale === "ka" ? ka : en);
  const points = report.trend;
  const max = Math.max(4, ...points.flatMap((p) => [p.clicks, p.orders]));
  const x = (i: number) => 44 + (i / Math.max(1, points.length - 1)) * 530;
  const y = (n: number) => 184 - (n / max) * 150;
  const line = (key: "clicks" | "orders") =>
    points.map((p, i) => `${x(i)},${y(p[key])}`).join(" ");
  return (
    <section className="dashboard-panel">
      <h2>{text("Performance over time", "შედეგების დინამიკა")}</h2>
      <div className="chart-legend">
        <span>
          <i />
          {text("Clicks", "კლიკები")}
        </span>
        <span>
          <i />
          {text("Orders", "შეკვეთები")}
        </span>
      </div>
      <svg
        className="dashboard-chart"
        viewBox="0 0 610 220"
        role="img"
        aria-label={text(
          "Daily clicks and attributed orders, last 30 days",
          "დღიური კლიკები და მიკუთვნებული შეკვეთები, ბოლო 30 დღე",
        )}
      >
        <title>
          {text("Daily clicks and orders", "დღიური კლიკები და შეკვეთები")}
        </title>
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <g key={p}>
            <line
              x1="44"
              y1={y(max * p)}
              x2="574"
              y2={y(max * p)}
              stroke="#e6ebf5"
            />
            <text
              x="34"
              y={y(max * p) + 4}
              textAnchor="end"
              className="chart-axis"
            >
              {Math.round(max * p)}
            </text>
          </g>
        ))}
        {points.length > 0 && (
          <>
            <polygon
              points={`44,184 ${line("clicks")} 574,184`}
              fill="#3478ff"
              opacity=".07"
            />
            <polyline
              points={line("clicks")}
              fill="none"
              stroke="#3478ff"
              strokeWidth="2.4"
            />
            <polyline
              points={line("orders")}
              fill="none"
              stroke="#9755ff"
              strokeWidth="2.4"
            />
            {[0, Math.floor((points.length - 1) / 2), points.length - 1].map(
              (i, index) => (
                <text
                  key={index}
                  x={x(i)}
                  y="210"
                  textAnchor="middle"
                  className="chart-axis"
                >
                  {points[i]?.date.slice(5)}
                </text>
              ),
            )}
          </>
        )}
      </svg>
      <p className="registration-note">
        {text(
          "Daily counts. Open analytics to inspect the underlying records.",
          "დღიური რაოდენობა. ჩანაწერების სანახავად გახსენი ანალიტიკა.",
        )}
      </p>
    </section>
  );
}

export function WorkspaceOverview({
  locale,
  name,
  report,
  products,
  discover,
}: {
  locale: Locale;
  name: string;
  report: PerformanceReport;
  products: HomeProduct[];
  discover: HomeProduct[];
}) {
  const text = (en: string, ka: string) => (locale === "ka" ? ka : en);
  const brand = report.role === "brand";
  const root = `/${locale}/${report.role}`;
  const analytics = `${root}/${brand ? "performance" : "earnings"}`;
  const money = (s: string) => `${new Decimal(s).toFixed(2)} ₾`;
  const metrics: {
    value: string;
    label: string;
    icon: IconName;
    href: string;
  }[] = [
    {
      value: report.totals.clicks.toLocaleString(locale),
      label: text("Recorded clicks", "დაფიქსირებული კლიკები"),
      icon: "click",
      href: analytics + "#click-ledger",
    },
    {
      value: report.totals.orders.toLocaleString(locale),
      label: text("Attributed orders", "მიკუთვნებული შეკვეთები"),
      icon: "cart",
      href: analytics + "#earnings-ledger",
    },
    {
      value: money(report.totals.sales),
      label: text("Attributed sales", "მიკუთვნებული გაყიდვები"),
      icon: "chart",
      href: analytics + "#earnings-ledger",
    },
    {
      value: money(report.totals.confirmed),
      label: text(
        brand ? "Earned creator commission" : "Your earned commission",
        brand
          ? "კრეატორის გამომუშავებული საკომისიო"
          : "შენი გამომუშავებული საკომისიო",
      ),
      icon: "wallet",
      href: analytics + "?status=CONFIRMED#earnings-ledger",
    },
  ];
  function cards(items: HomeProduct[], active: boolean) {
    return items.length ? (
      <div className="dashboard-product-grid">
        {items.map((p) => {
          const stats =
            report.breakdowns.links.find((r) => r.id === p.linkId) ??
            report.breakdowns.products.find((r) => r.id === p.id);
          const rate =
            p.commissionType === "PERCENT"
              ? new Decimal(p.commissionValue).times(100).toString() + "%"
              : money(p.commissionValue);
          return (
            <article className="dashboard-product" key={p.linkId ?? p.id}>
              <div className="dashboard-product-top">
                <ProductThumbnail src={p.imageUrl} />
                <div>
                  <h3>
                    <Link
                      href={`/${locale}/${brand ? "brand/products" : "products"}/${p.id}`}
                      className="product-title-link"
                    >
                      {p.title}
                    </Link>
                  </h3>
                  <p>{p.brandName}</p>
                  <strong>{money(p.price)}</strong>
                </div>
              </div>
              <p>
                {text("Estimated catalog price", "სავარაუდო კატალოგის ფასი")}
              </p>
              <p>
                {text("Commission", "საკომისიო")}: <strong>{rate}</strong>
              </p>
              {active && (
                <div className="product-mini-stats">
                  <span>
                    {text("Orders", "შეკვეთები")}
                    <strong>{stats?.orders ?? 0}</strong>
                  </span>
                  <span>
                    {text("Earned commission", "გამომუშავებული საკომისიო")}
                    <strong>{money(stats?.confirmed ?? "0")}</strong>
                  </span>
                </div>
              )}
              {p.linkUrl ? (
                <DashboardCopy url={p.linkUrl} locale={locale} />
              ) : (
                <Link
                  className={`x-button ${active ? "outline" : "primary"}`}
                  href={`/${locale}/${brand ? "brand/products" : "products"}/${p.id}`}
                >
                  {text(
                    brand ? "Manage product" : "View offer",
                    brand ? "პროდუქტის მართვა" : "შეთავაზების ნახვა",
                  )}
                  <Icon name="arrow" />
                </Link>
              )}
            </article>
          );
        })}
      </div>
    ) : (
      <div className="dashboard-empty">
        <Icon name="box" />
        <h3>
          {text(
            active
              ? "Your next chapter starts here"
              : "New opportunities are on their way",
            active
              ? "შენი ახალი ეტაპი აქ იწყება"
              : "ახალი შესაძლებლობები მალე გამოჩნდება",
          )}
        </h3>
        <p>
          {text(
            active
              ? "Add a product or accept an offer to see it here."
              : "Explore the catalog for available products.",
            active
              ? "დაამატე პროდუქტი ან მიიღე შეთავაზება, რომ აქ გამოჩნდეს."
              : "ხელმისაწვდომი პროდუქტები ნახე კატალოგში.",
          )}
        </p>
        <Link
          className="x-button primary"
          href={brand ? `${root}/products/new` : `/${locale}/products`}
        >
          {text(
            brand ? "Add product" : "Explore products",
            brand ? "პროდუქტის დამატება" : "პროდუქტების ნახვა",
          )}
        </Link>
      </div>
    );
  }
  return (
    <div className="workspace-content">
      <header className="overview-heading">
        <div>
          <h1>
            {text(
              brand ? "Welcome back, " : "Hello, ",
              brand ? "კეთილი იყოს შენი დაბრუნება, " : "გამარჯობა, ",
            )}
            {name}!
          </h1>
          <p>
            {text(
              "Here is how your connections performed this month.",
              "ასეთია შენი თანამშრომლობის შედეგები ამ თვეში.",
            )}
          </p>
        </div>
        <Link className="period-link" href={analytics}>
          <Icon name="calendar" />
          {text("Last 30 days", "ბოლო 30 დღე")}
          <span>⌄</span>
        </Link>
      </header>
      <div className="overview-metrics">
        {metrics.map((m) => (
          <Link className="metric-card" href={m.href} key={m.label}>
            <span className="metric-icon">
              <Icon name={m.icon} />
            </span>
            <div>
              <strong>{m.value}</strong>
              <span className="metric-label">{m.label}</span>
              <small>{text("View details →", "დეტალების ნახვა →")}</small>
            </div>
          </Link>
        ))}
      </div>
      {brand && (
        <div className="overview-charts">
          <OverviewChart report={report} locale={locale} />
          <ProductDistribution report={report} locale={locale} />
        </div>
      )}
      <div className="overview-grid">
        <div className="overview-main">
          <section>
            <div className="section-heading">
              <h2>
                {text(
                  brand ? "Your products" : "Your active products",
                  brand ? "შენი პროდუქტები" : "შენი აქტიური პროდუქტები",
                )}
              </h2>
              <Link href={`${root}/${brand ? "products" : "links"}`}>
                {text("View all", "ყველას ნახვა")}
                <Icon name="arrow" width="16" />
              </Link>
            </div>
            {cards(products, true)}
          </section>
          <section>
            <div className="section-heading">
              <h2>
                {text(
                  brand
                    ? "Grow your next collaboration"
                    : "Discover your next opportunity",
                  brand
                    ? "გააფართოვე თანამშრომლობა"
                    : "აღმოაჩინე ახალი შესაძლებლობა",
                )}
              </h2>
              <Link href={`/${locale}/${brand ? "creators" : "products"}`}>
                {text("Explore", "აღმოაჩინე")}
                <Icon name="arrow" width="16" />
              </Link>
            </div>
            {brand ? (
              <div className="dashboard-panel soon-panel">
                <h2>{text("Find your people", "იპოვე შენი ადამიანები")}</h2>
                <p>
                  {text(
                    "Discover creators and invite them to collaborate with your brand.",
                    "აღმოაჩინე კრეატორები და მოიწვიე შენს ბრენდთან თანამშრომლობისთვის.",
                  )}
                </p>
                <Link
                  className="x-button primary"
                  href={`/${locale}/creators`}
                  style={{ marginTop: 18 }}
                >
                  {text("Discover creators", "კრეატორების ძიება")}
                  <Icon name="arrow" />
                </Link>
              </div>
            ) : (
              cards(discover, false)
            )}
          </section>
        </div>
        <aside className="overview-aside">
          <section className="dashboard-panel">
            <div className="section-heading">
              <h2>{text("Recent activity", "ბოლო აქტივობა")}</h2>
              <Link href={analytics + "#earnings-ledger"}>
                {text("View all", "ყველას ნახვა")} →
              </Link>
            </div>
            {report.ledger.rows.length ? (
              <div className="activity-list">
                {report.ledger.rows.slice(0, 5).map((row) => (
                  <Link
                    className="activity-row product-title-link"
                    href={analytics + `?link=${row.linkId}#earnings-ledger`}
                    key={row.id}
                  >
                    <span className="metric-icon">
                      <Icon name="cart" width="18" />
                    </span>
                    <div>
                      <strong>{row.productTitle}</strong>
                      <small>
                        {new Intl.DateTimeFormat(
                          locale === "ka" ? "ka-GE" : "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            timeZone: "Asia/Tbilisi",
                          },
                        ).format(new Date(row.occurredAt))}{" "}
                        ·{" "}
                        {text(
                          row.status === "CONFIRMED"
                            ? "Confirmed"
                            : "Cancelled",
                          row.status === "CONFIRMED"
                            ? "დადასტურებული"
                            : "გაუქმებული",
                        )}
                      </small>
                    </div>
                    <strong
                      className={
                        row.status === "CANCELLED"
                          ? "activity-amount cancelled"
                          : "activity-amount"
                      }
                    >
                      {money(row.commissionAmount)}
                    </strong>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="registration-note">
                {text(
                  "Your first attributed sale will appear here.",
                  "შენი პირველი მიკუთვნებული გაყიდვა აქ გამოჩნდება.",
                )}
              </p>
            )}
          </section>
          <section className="dashboard-panel soon-panel">
            <span className="soon-label">{text("Coming soon", "მალე")}</span>
            <h2>{text("Payouts, in one place", "გადახდები ერთ სივრცეში")}</h2>
            <p>
              {text(
                "A dedicated view for payout schedules and transfers is on its way. Earned commission does not mean paid.",
                "გადახდების გრაფიკისა და ჩარიცხვების განყოფილება მზადდება. გამომუშავებული საკომისიო არ ნიშნავს ჩარიცხულ თანხას.",
              )}
            </p>
          </section>
        </aside>
      </div>
      <div className="dashboard-actions">
        {[
          {
            icon: "users" as const,
            title: text("Build new connections", "შექმენი ახალი კავშირები"),
            body: text(
              "Meet the people behind your next collaboration.",
              "გაიცანი ადამიანები შენი მომავალი თანამშრომლობისთვის.",
            ),
            href: `/${locale}/${brand ? "creators" : "brands"}`,
            action: text("Explore community", "გაიცანი საზოგადოება"),
          },
          {
            icon: "box" as const,
            title: text(
              brand ? "Add your next product" : "Find your next product",
              brand ? "დაამატე ახალი პროდუქტი" : "იპოვე ახალი პროდუქტი",
            ),
            body: text(
              "Create new possibilities for your audience.",
              "შექმენი ახალი შესაძლებლობები შენი აუდიტორიისთვის.",
            ),
            href: brand ? `${root}/products/new` : `/${locale}/products`,
            action: text(
              brand ? "Add product" : "Explore products",
              brand ? "პროდუქტის დამატება" : "პროდუქტების ნახვა",
            ),
          },
          {
            icon: "chart" as const,
            title: text("Understand your results", "გაანალიზე შენი შედეგები"),
            body: text(
              "Follow every click through to its outcome.",
              "მიჰყევი თითოეულ კლიკს მის შედეგამდე.",
            ),
            href: analytics,
            action: text("View analytics", "ანალიტიკის ნახვა"),
          },
        ].map((a) => (
          <section className="dashboard-action" key={a.icon}>
            <Icon name={a.icon} />
            <div>
              <h3>{a.title}</h3>
              <p>{a.body}</p>
              <Link className="x-button primary" href={a.href}>
                {a.action}
                <Icon name="arrow" width="16" />
              </Link>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
