import Link from "next/link";
import {
  ProductReportLink,
  ProductBackLink,
  RestoreProductScroll,
} from "./product-navigation";
import type { Locale } from "@/src/modules/localization";
import {
  adminPerformanceParams,
  type AdminPerformanceReport,
  type AdminProductPerformanceReport,
  type AdminPerformanceMetrics,
} from "@/src/modules/conversions";
import type { AdminPerformanceFinance } from "../ports/admin-performance-finance";
import { financeText, financeMoney } from "./finance-copy";
import { AdminPerformanceFilters } from "./admin-performance-filters";
import { AdminPerformanceTrend } from "./admin-performance-trend";
import { DownloadCsvButton } from "./download-csv-button";
import { FinancePagination } from "./finance-histories";
export function CommercialMetrics({
  metrics,
  locale,
  clicks = false,
}: {
  metrics: AdminPerformanceMetrics;
  locale: Locale;
  clicks?: boolean;
}) {
  const t = financeText(locale);
  return (
    <div className={`finance-metrics ${clicks ? "finance-four-metrics" : ""}`}>
      {clicks && (
        <div className="finance-metric">
          <span>{t("Creditable clicks", "ჩათვლადი დაწკაპუნებები")}</span>
          <strong>{metrics.clicks}</strong>
        </div>
      )}
      <div className="finance-metric">
        <span>
          {t(
            "Attributed confirmed sales",
            "მიკუთვნებული დადასტურებული გაყიდვები",
          )}
        </span>
        <strong>{metrics.salesCount}</strong>
        <small>
          {t("Cancelled sales excluded", "გაუქმებული გაყიდვების გარეშე")}
        </small>
      </div>
      <div className="finance-metric">
        <span>{t("Sales value", "გაყიდვების ღირებულება")}</span>
        <strong>{financeMoney(metrics.salesValue, locale)}</strong>
        <small>
          {t(
            "Attributed product net value",
            "მიკუთვნებული პროდუქტის წმინდა ღირებულება",
          )}
        </small>
      </div>
      <div className="finance-metric">
        <span>
          {t("Earned creator commission", "კრეატორის გამომუშავებული საკომისიო")}
        </span>
        <strong>{financeMoney(metrics.commission, locale)}</strong>
        <small>{t("From confirmed sales", "დადასტურებული გაყიდვებიდან")}</small>
      </div>
    </div>
  );
}
export function AdminPerformance({
  report,
  finance,
  options,
  locale,
  basePath,
  listPath,
  listPage,
}: {
  report: AdminPerformanceReport | AdminProductPerformanceReport;
  finance: AdminPerformanceFinance;
  options: {
    brands: { id: string; name: string }[];
    creators: { id: string; name: string }[];
  };
  locale: Locale;
  basePath: string;
  listPath: string;
  listPage: string;
}) {
  const t = financeText(locale),
    q = report.query,
    product = "product" in report ? report.product : undefined,
    products = q.tab === "products" && !product,
    root = `/${locale}/admin`;
  const params = (changes: Record<string, string | undefined> = {}) =>
    adminPerformanceParams(q, {
      ...(product
        ? {
            returnTo: listPath.endsWith("/performance")
              ? "performance"
              : "products",
            listPage,
          }
        : {}),
      ...changes,
    }).toString();
  const exportHref = `/api/admin/performance/export?${params({ scope: product ? "product_creators" : q.tab, productId: product?.id, page: undefined })}`;
  const title = product
    ? product.title
    : products
      ? t("Products", "პროდუქტები")
      : t("Platform performance", "პლატფორმის შედეგები");
  const brandFinance = new Map(finance.brands.map((b) => [b.id, b])),
    creatorFinance = new Map(finance.creators.map((c) => [c.id, c]));
  const payment = (id: string) =>
    q.tab === "brands"
      ? brandFinance.get(id)?.periodReceipts || "0.00"
      : creatorFinance.get(id)?.periodPayouts || "0.00";
  const balance = (id: string) =>
    q.tab === "brands"
      ? brandFinance.get(id)?.outstanding || "0.00"
      : creatorFinance.get(id)?.unpaid || "0.00";
  const financial = !product && (q.tab === "brands" || q.tab === "creators");
  const accountHref = (id: string, kind: string) =>
    `${root}/performance?${params({ tab: "overview", [kind === "brand" ? "brandId" : "creatorId"]: id, page: "1" })}`;
  const productHref = (id: string) =>
    `${root}/products/${id}?${params({ returnTo: basePath.endsWith("/performance") ? "performance" : "products", listPage: String(q.page), page: "1" })}`;
  const sort = (key: string, label: string) => (
    <Link
      scroll={false}
      href={`${basePath}?${params({ sort: key, direction: q.sort === key && q.direction === "desc" ? "asc" : "desc", page: "1" })}`}
    >
      {label}
      {q.sort === key ? (q.direction === "desc" ? " ↓" : " ↑") : ""}
    </Link>
  );
  return (
    <div className="finance-surface workspace-content">
      {!product && <RestoreProductScroll />}
      <header className="finance-heading">
        <div>
          {product && (
            <ProductBackLink
              href={`${listPath}?${params({ tab: "products", page: listPage, returnTo: undefined, listPage: undefined })}`}
            >
              {t("Back to products", "პროდუქტებზე დაბრუნება")}
            </ProductBackLink>
          )}
          <h1>{title}</h1>
          <p>
            {product ? (
              <>
                {product.sku} ·{" "}
                <Link href={accountHref(product.brandId, "brand")}>
                  {product.brandName}
                </Link>{" "}
                ·{" "}
                {product.status === "ARCHIVED"
                  ? t("Archived", "დაარქივებული")
                  : t("Active", "აქტიური")}
              </>
            ) : products ? (
              t(
                "Performance across your entire catalogue, including archived products.",
                "მთელი კატალოგის შედეგები, დაარქივებული პროდუქტების ჩათვლით.",
              )
            ) : (
              t(
                "Understand results across brands, creators and products.",
                "გაეცანით ბრენდების, კრეატორებისა და პროდუქტების შედეგებს.",
              )
            )}
          </p>
        </div>
        <DownloadCsvButton
          href={exportHref}
          locale={locale}
          allRows={q.tab !== "overview" || !!product}
        />
      </header>
      {!product && (
        <nav
          className="finance-tabs"
          aria-label={t("Performance views", "ანალიტიკის ხედები")}
        >
          {[
            ["overview", t("Overview", "მიმოხილვა")],
            ["brands", t("Brands", "ბრენდები")],
            ["creators", t("Creators", "კრეატორები")],
            ["products", t("Products", "პროდუქტები")],
          ].map(([key, label]) => (
            <Link
              key={key}
              aria-current={key === q.tab ? "page" : undefined}
              href={`${root}/${key === "products" ? "products" : "performance"}?${params({ tab: key, page: key === q.tab ? String(q.page) : "1" })}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
      <AdminPerformanceFilters
        key={params()}
        query={q}
        locale={locale}
        options={options}
        basePath={basePath}
        product={!!product}
        returnState={
          product
            ? {
                returnTo: listPath.endsWith("/performance")
                  ? "performance"
                  : "products",
                listPage,
              }
            : {}
        }
      />
      <p className="finance-scope">
        <strong>{t("Commercial results", "კომერციული შედეგები")}</strong> ·{" "}
        {q.from} — {q.to} ·{" "}
        {t("Selected brands and creators", "არჩეული ბრენდები და კრეატორები")}
      </p>
      {(q.tab === "overview" || product) && (
        <>
          <CommercialMetrics
            metrics={report.totals}
            locale={locale}
            clicks={!!product}
          />
          <AdminPerformanceTrend trend={report.trend} locale={locale} />
        </>
      )}
      {q.tab === "overview" && !product ? (
        <div className="finance-platform-regions">
          <section className="finance-panel">
            <h2>{t("Platform payments", "პლატფორმის გადახდები")}</h2>
            <p>
              {t(
                "All accounts · Selected transfer dates",
                "ყველა ანგარიში · გადარიცხვის არჩეული თარიღები",
              )}
            </p>
            <dl className="finance-platform-values">
              <div>
                <dt>
                  {t(
                    "Brand payments received",
                    "ბრენდებისგან მიღებული გადახდები",
                  )}
                </dt>
                <dd>{financeMoney(finance.period.brandReceipts, locale)}</dd>
              </div>
              <div>
                <dt>{t("Creator payouts", "კრეატორების გადახდები")}</dt>
                <dd>{financeMoney(finance.period.creatorPayouts, locale)}</dd>
              </div>
            </dl>
            <p className="finance-note">
              {t(
                "Ignores brand and creator filters. Reversals correct the original transfer period.",
                "ბრენდისა და კრეატორის ფილტრები არ მოქმედებს. გაუქმება ასწორებს საწყისი გადარიცხვის პერიოდს.",
              )}
            </p>
          </section>
          <section className="finance-panel">
            <h2>
              {t("Current platform balances", "პლატფორმის მიმდინარე ბალანსები")}
            </h2>
            <p>
              {t(
                "All accounts · All time · Not date-filtered",
                "ყველა ანგარიში · მთელი პერიოდი · თარიღით არ იფილტრება",
              )}
            </p>
            <dl className="finance-platform-values">
              {[
                [
                  t("Brand outstanding", "ბრენდების დარჩენილი ვალდებულება"),
                  finance.current.brandOutstanding,
                ],
                [
                  t("Creator unpaid", "კრეატორების გადაუხდელი შემოსავალი"),
                  finance.current.creatorUnpaid,
                ],
                [
                  t("Brand credits", "ბრენდების კრედიტები"),
                  finance.current.brandCredits,
                ],
                [
                  t(
                    "Creator overpayments",
                    "კრეატორებისთვის ზედმეტად გადახდილი",
                  ),
                  finance.current.creatorOverpayments,
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{financeMoney(value!, locale)}</dd>
                </div>
              ))}
            </dl>
            <p className="finance-note">
              {t(
                "Debts and credits are shown separately. No offset between accounts.",
                "ვალდებულებები და კრედიტები ცალ-ცალკე ჩანს. ანგარიშები ერთმანეთს არ ფარავს.",
              )}
            </p>
          </section>
        </div>
      ) : (
        <section className="finance-panel">
          <header className="finance-heading">
            <div>
              <h2>
                {product
                  ? t("Creator breakdown", "კრეატორების შედეგები")
                  : products
                    ? t("Entire catalogue", "მთელი კატალოგი")
                    : q.tab === "brands"
                      ? t("Brand breakdown", "ბრენდების შედეგები")
                      : t("Creator breakdown", "კრეატორების შედეგები")}
              </h2>
              <p>
                {financial
                  ? t(
                      "Commercial filters do not allocate account transfers.",
                      "კომერციული ფილტრები ანგარიშის გადარიცხვებს არ ანაწილებს.",
                    )
                  : t(
                      "Includes linked creators and products with zero activity.",
                      "მოიცავს დაკავშირებულ კრეატორებსა და პროდუქტებს ნულოვანი აქტივობით.",
                    )}
              </p>
            </div>
            <span>
              {report.rows.total} {t("results", "შედეგი")}
            </span>
          </header>
          <div className="finance-desktop-table">
            <table className="finance-report-table">
              <thead>
                {financial && (
                  <tr className="finance-column-groups">
                    <th colSpan={5}>
                      {t(
                        "Filtered commercial results",
                        "გაფილტრული კომერციული შედეგები",
                      )}
                    </th>
                    <th colSpan={3}>
                      {t("Account-wide finance", "ანგარიშის სრული ფინანსები")}
                    </th>
                  </tr>
                )}
                <tr>
                  <th>
                    {sort(
                      "name",
                      product
                        ? t("Creator", "კრეატორი")
                        : products
                          ? t("Product / SKU", "პროდუქტი / SKU")
                          : t("Account", "ანგარიში"),
                    )}
                  </th>
                  {products && (
                    <>
                      <th>{t("Brand", "ბრენდი")}</th>
                      <th>{t("Status", "სტატუსი")}</th>
                    </>
                  )}
                  <th>{sort("clicks", t("Clicks", "დაწკაპუნებები"))}</th>
                  <th>
                    {sort(
                      "sales_count",
                      t("Attributed sales", "მიკუთვნებული გაყიდვები"),
                    )}
                  </th>
                  <th>
                    {sort(
                      "sales_value",
                      t("Sales value (GEL)", "გაყიდვების ღირებულება (GEL)"),
                    )}
                  </th>
                  <th>
                    {sort(
                      "commission",
                      t("Commission (GEL)", "საკომისიო (GEL)"),
                    )}
                  </th>
                  {financial && (
                    <>
                      <th className="finance-account-column">
                        {t(
                          "Account payments (period)",
                          "ანგარიშის გადახდები (პერიოდი)",
                        )}
                      </th>
                      <th>
                        {t(
                          "Account balance (all time)",
                          "ანგარიშის ბალანსი (მთელი პერიოდი)",
                        )}
                      </th>
                      <th>{t("Manage", "მართვა")}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {report.rows.items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <ProductReportLink
                        href={
                          products
                            ? productHref(r.id)
                            : accountHref(r.id, r.kind)
                        }
                      >
                        {r.name}
                      </ProductReportLink>
                      {products && <small>{r.sku}</small>}
                    </td>
                    {products && (
                      <>
                        <td>
                          <Link href={accountHref(r.brandId!, "brand")}>
                            {r.brandName}
                          </Link>
                        </td>
                        <td>
                          <span className="finance-badge">
                            {r.status === "ARCHIVED"
                              ? t("Archived", "დაარქივებული")
                              : t("Active", "აქტიური")}
                          </span>
                        </td>
                      </>
                    )}
                    <td>{r.clicks}</td>
                    <td>{r.salesCount}</td>
                    <td>{financeMoney(r.salesValue, locale)}</td>
                    <td>{financeMoney(r.commission, locale)}</td>
                    {financial && (
                      <>
                        <td className="finance-account-column">
                          {financeMoney(payment(r.id), locale)}
                        </td>
                        <td>
                          {financeMoney(balance(r.id), locale)}
                          {balance(r.id).startsWith("-") && (
                            <small className="finance-credit">
                              {q.tab === "brands"
                                ? t("Credit", "კრედიტი")
                                : t(
                                    "Paid above current earnings",
                                    "მიმდინარე შემოსავალზე მეტი გადახდა",
                                  )}
                            </small>
                          )}
                        </td>
                        <td>
                          <Link href={`${root}/finance/${r.kind}/${r.id}`}>
                            {t("Finance", "ფინანსები")}
                          </Link>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="finance-mobile-cards">
            {report.rows.items.map((r) => (
              <article key={r.id}>
                <h3>
                  <ProductReportLink
                    href={
                      products ? productHref(r.id) : accountHref(r.id, r.kind)
                    }
                  >
                    {r.name}
                  </ProductReportLink>
                </h3>
                {products && (
                  <p>
                    {r.sku} · {r.brandName} ·{" "}
                    {r.status === "ARCHIVED"
                      ? t("Archived", "დაარქივებული")
                      : t("Active", "აქტიური")}
                  </p>
                )}
                <dl>
                  {[
                    [t("Clicks", "დაწკაპუნებები"), r.clicks],
                    [
                      t("Attributed sales", "მიკუთვნებული გაყიდვები"),
                      r.salesCount,
                    ],
                    [
                      t("Sales value", "გაყიდვების ღირებულება"),
                      financeMoney(r.salesValue, locale),
                    ],
                    [
                      t("Commission", "საკომისიო"),
                      financeMoney(r.commission, locale),
                    ],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                {financial && (
                  <div className="finance-account-block">
                    <strong>
                      {t("Account-wide finance", "ანგარიშის სრული ფინანსები")}
                    </strong>
                    <dl>
                      <div>
                        <dt>
                          {t(
                            "Account payments (period)",
                            "ანგარიშის გადახდები (პერიოდი)",
                          )}
                        </dt>
                        <dd>{financeMoney(payment(r.id), locale)}</dd>
                      </div>
                      <div>
                        <dt>
                          {t(
                            "Account balance (all time)",
                            "ანგარიშის ბალანსი (მთელი პერიოდი)",
                          )}
                        </dt>
                        <dd>
                          {financeMoney(balance(r.id), locale)}
                          {balance(r.id).startsWith("-") && (
                            <small>
                              {q.tab === "brands"
                                ? t("Credit", "კრედიტი")
                                : t(
                                    "Paid above current earnings",
                                    "მიმდინარე შემოსავალზე მეტი გადახდა",
                                  )}
                            </small>
                          )}
                        </dd>
                      </div>
                    </dl>
                    <Link href={`${root}/finance/${r.kind}/${r.id}`}>
                      {t("Finance", "ფინანსები")}
                    </Link>
                  </div>
                )}
              </article>
            ))}
          </div>
          {!report.rows.items.length && (
            <p className="finance-empty">
              {t(
                "No matching results. Try changing your filters.",
                "შედეგები ვერ მოიძებნა. სცადეთ ფილტრების შეცვლა.",
              )}
            </p>
          )}
          <FinancePagination
            data={report.rows}
            basePath={basePath}
            params={Object.fromEntries(new URLSearchParams(params()))}
            locale={locale}
          />
        </section>
      )}
      <p className="finance-report-footer">
        {t(
          "Current cancellations are excluded from commercial results. Asia/Tbilisi · GEL",
          "მიმდინარე გაუქმებები გამორიცხულია კომერციული შედეგებიდან. Asia/Tbilisi · GEL",
        )}
      </p>
    </div>
  );
}
