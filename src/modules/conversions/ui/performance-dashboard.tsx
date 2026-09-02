import Image from "next/image";
import Link from "next/link";
import {
  EmptyState,
  MoneyAmount,
  StatusPill,
} from "@/src/modules/design-system";
import { t, type Locale, type Messages } from "@/src/modules/localization";
import { Money } from "@/src/modules/shared";
import type { PerformancePageState } from "../application/performance-query";
import type {
  PerformanceBreakdownKind,
  PerformanceBreakdownRow,
  PerformanceReport,
} from "../ports/performance";
import { EarningsLedger } from "./earnings-ledger";
import { ClickLedger } from "./click-ledger";
import { PerformanceFilters } from "./performance-filters";
import { performanceHref } from "./performance-links";
import { PerformanceTrend } from "./performance-trend";

function formatCount(locale: Locale, value: number) {
  return new Intl.NumberFormat(locale === "ka" ? "ka-GE" : "en-GB").format(
    value,
  );
}

function formatRate(locale: Locale, value: number) {
  return new Intl.NumberFormat(locale === "ka" ? "ka-GE" : "en-GB", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function comparisonLabel(
  locale: Locale,
  messages: Messages,
  current: number,
  previous: number | undefined,
) {
  if (previous === undefined) return undefined;
  if (previous === 0)
    return current === 0
      ? t(messages, "performance.comparison.noChange")
      : t(messages, "performance.comparison.new");
  const change = (current - previous) / previous;
  const value = new Intl.NumberFormat(locale === "ka" ? "ka-GE" : "en-GB", {
    style: "percent",
    signDisplay: "always",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(change);
  return t(messages, "performance.comparison.previous").replace(
    "{change}",
    value,
  );
}

function statementFor(
  report: PerformanceReport,
  locale: Locale,
  messages: Messages,
) {
  const { totals } = report;
  if (totals.clicks === 0)
    return t(messages, "performance.statement.noActivity");
  if (totals.orders === 0)
    return t(messages, "performance.statement.noOrders").replace(
      "{clicks}",
      formatCount(locale, totals.clicks),
    );
  return t(messages, `performance.statement.${report.role}`)
    .replace("{clicks}", formatCount(locale, totals.clicks))
    .replace("{orders}", formatCount(locale, totals.orders));
}

function MetricRail({
  report,
  locale,
  messages,
  basePath,
  state,
}: {
  report: PerformanceReport;
  locale: Locale;
  messages: Messages;
  basePath: string;
  state: PerformancePageState;
}) {
  const metrics = [
    {
      key: "clicks",
      label: t(messages, "performance.metric.recordedClicks"),
      value: formatCount(locale, report.totals.clicks),
      change: comparisonLabel(
        locale,
        messages,
        report.totals.clicks,
        report.comparison?.clicks,
      ),
      href: performanceHref(
        basePath,
        state.filters,
        state,
        { view: "links" },
        "click-ledger",
      ),
    },
    {
      key: "converted",
      label: t(messages, "performance.metric.convertedClicks"),
      value: formatCount(locale, report.totals.convertedClicks),
      change: comparisonLabel(
        locale,
        messages,
        report.totals.convertedClicks,
        report.comparison?.convertedClicks,
      ),
      href: performanceHref(
        basePath,
        state.filters,
        state,
        { view: "links" },
        "click-ledger",
      ),
    },
    {
      key: "orders",
      label: t(messages, "performance.metric.orders"),
      value: formatCount(locale, report.totals.orders),
      change: comparisonLabel(
        locale,
        messages,
        report.totals.orders,
        report.comparison?.orders,
      ),
      href: performanceHref(
        basePath,
        state.filters,
        state,
        { ledgerPage: undefined },
        "earnings-ledger",
      ),
    },
    {
      key: "rate",
      label: t(messages, "performance.metric.rate"),
      value: formatRate(locale, report.totals.convertedClickRate),
      change: comparisonLabel(
        locale,
        messages,
        report.totals.convertedClickRate,
        report.comparison?.convertedClickRate,
      ),
      href: performanceHref(
        basePath,
        state.filters,
        state,
        { view: "links" },
        "breakdown",
      ),
    },
    ...(report.role === "brand"
      ? [
          {
            key: "sales",
            label: t(messages, "performance.metric.sales"),
            value: <MoneyAmount value={Money.of(report.totals.sales)} />,
            change: comparisonLabel(
              locale,
              messages,
              Number(report.totals.sales),
              report.comparison ? Number(report.comparison.sales) : undefined,
            ),
            href: performanceHref(
              basePath,
              state.filters,
              state,
              { view: "products" },
              "breakdown",
            ),
          },
        ]
      : []),
    {
      key: "confirmed",
      label: t(messages, "performance.metric.confirmed"),
      value: <MoneyAmount value={Money.of(report.totals.confirmed)} />,
      change: comparisonLabel(
        locale,
        messages,
        Number(report.totals.confirmed),
        report.comparison ? Number(report.comparison.confirmed) : undefined,
      ),
      href: performanceHref(
        basePath,
        state.filters,
        state,
        { status: "CONFIRMED", ledgerPage: undefined },
        "earnings-ledger",
      ),
    },
  ];
  return (
    <div
      className={`mt-6 grid overflow-hidden rounded-sm border border-slate-200 bg-paper sm:grid-cols-2 ${report.role === "brand" ? "xl:grid-cols-6" : "xl:grid-cols-5"}`}
    >
      {metrics.map((metric) => (
        <Link
          className="group min-w-0 border-b border-slate-200 p-4 no-underline last:border-b-0 hover:bg-slate-50 sm:border-r sm:[&:nth-child(2)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2)]:border-r xl:last:border-r-0"
          href={metric.href}
          key={metric.key}
        >
          <span className="block type-caption text-slate-600">
            {metric.label}
          </span>
          <span className="mt-1 flex items-center justify-between gap-3 type-figure text-ink">
            {metric.value}
            <svg
              aria-hidden="true"
              className="size-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 16 16"
            >
              <path
                d="m6 3 5 5-5 5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
          </span>
          {metric.change ? (
            <span className="mt-2 block type-caption text-slate-600">
              {metric.change}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

function sourceFilterName(kind: PerformanceBreakdownKind) {
  return kind === "brands"
    ? "brand"
    : kind === "creators"
      ? "creator"
      : kind === "products"
        ? "product"
        : "link";
}

function Breakdown({
  report,
  locale,
  messages,
  basePath,
  state,
}: {
  report: PerformanceReport;
  locale: Locale;
  messages: Messages;
  basePath: string;
  state: PerformancePageState;
}) {
  const tabs: PerformanceBreakdownKind[] =
    report.role === "creator"
      ? ["brands", "products", "links"]
      : ["creators", "products", "links"];
  const allRows = report.breakdowns[state.breakdown];
  const pageSize = 20;
  const pageCount = Math.max(Math.ceil(allRows.length / pageSize), 1);
  const page = Math.min(state.filters.breakdownPage ?? 1, pageCount);
  const rows = allRows.slice((page - 1) * pageSize, page * pageSize);
  const destinationFor = (row: PerformanceBreakdownRow) =>
    performanceHref(
      basePath,
      state.filters,
      state,
      {
        [sourceFilterName(state.breakdown)]: row.id,
        ledgerPage: undefined,
        breakdownPage: undefined,
      },
      "breakdown",
    );
  const evidenceFor = (
    row: PerformanceBreakdownRow,
    anchor: "click-ledger" | "earnings-ledger",
    updates: Record<string, string | number | undefined> = {},
  ) =>
    performanceHref(
      basePath,
      state.filters,
      state,
      {
        [sourceFilterName(state.breakdown)]: row.id,
        breakdownPage: undefined,
        clickPage: undefined,
        ledgerPage: undefined,
        ...updates,
      },
      anchor,
    );
  return (
    <section className="pt-7" id="breakdown" aria-labelledby="breakdown-title">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200">
        <div>
          <h2 className="m-0 type-h3 text-ink" id="breakdown-title">
            {t(messages, "performance.breakdown.title")}
          </h2>
          <p className="mb-4 mt-1 type-small text-slate-600">
            {t(messages, "performance.breakdown.intro")}
          </p>
        </div>
        <nav
          aria-label={t(messages, "performance.breakdown.title")}
          className="flex gap-5 overflow-x-auto"
        >
          {tabs.map((tab) => (
            <Link
              aria-current={state.breakdown === tab ? "page" : undefined}
              className={`shrink-0 border-b-2 pb-3 type-small font-semibold no-underline ${state.breakdown === tab ? "border-signal text-signal" : "border-transparent text-slate-600 hover:text-ink"}`}
              href={performanceHref(
                basePath,
                state.filters,
                state,
                { view: tab, breakdownPage: undefined },
                "breakdown",
              )}
              key={tab}
            >
              {t(messages, `performance.breakdown.${tab}`)}
            </Link>
          ))}
        </nav>
      </div>
      {rows.length === 0 ? (
        <div className="pt-6">
          <EmptyState
            body={t(messages, "performance.breakdown.emptyBody")}
            title={t(messages, "performance.breakdown.emptyTitle")}
          />
        </div>
      ) : (
        <>
          <div
            className="hidden max-w-full overflow-x-auto md:block"
            role="region"
            tabIndex={0}
            aria-label={t(messages, "performance.breakdown.caption")}
          >
            <table className="w-full min-w-[920px] border-collapse text-left type-small">
              <caption className="sr-only">
                {t(messages, "performance.breakdown.caption")}
              </caption>
              <thead>
                <tr className="border-b border-slate-300 text-slate-600">
                  <th className="px-3 py-3 font-semibold" scope="col">
                    {t(messages, "performance.breakdown.source")}
                  </th>
                  <th
                    className="px-3 py-3 text-right font-semibold"
                    scope="col"
                  >
                    {t(messages, "performance.metric.recordedClicks")}
                  </th>
                  <th
                    className="px-3 py-3 text-right font-semibold"
                    scope="col"
                  >
                    {t(messages, "performance.metric.convertedClicks")}
                  </th>
                  <th
                    className="px-3 py-3 text-right font-semibold"
                    scope="col"
                  >
                    {t(messages, "performance.metric.orders")}
                  </th>
                  <th
                    className="px-3 py-3 text-right font-semibold"
                    scope="col"
                  >
                    {t(messages, "performance.metric.rate")}
                  </th>
                  {report.role === "brand" ? (
                    <th
                      className="px-3 py-3 text-right font-semibold"
                      scope="col"
                    >
                      {t(messages, "performance.metric.sales")}
                    </th>
                  ) : null}
                  <th
                    className="px-3 py-3 text-right font-semibold"
                    scope="col"
                  >
                    {t(messages, "performance.metric.pending")}
                  </th>
                  <th
                    className="px-3 py-3 text-right font-semibold"
                    scope="col"
                  >
                    {t(messages, "performance.metric.confirmed")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    className="group border-b border-slate-200 last:border-b-0"
                    key={row.id}
                  >
                    <th className="px-3 py-4 font-normal" scope="row">
                      <Link
                        className="flex min-w-64 items-center gap-3 font-semibold text-ink no-underline group-hover:text-signal"
                        href={destinationFor(row)}
                      >
                        {row.imageUrl ? (
                          <span className="relative size-10 shrink-0 overflow-hidden rounded-xs bg-slate-100">
                            <Image
                              alt=""
                              fill
                              sizes="40px"
                              src={row.imageUrl}
                              unoptimized
                              className="object-cover"
                            />
                          </span>
                        ) : null}
                        <span className="min-w-0">
                          <span className="block">{row.label}</span>
                          {row.detail ? (
                            <span className="mt-1 block type-caption font-normal text-slate-600">
                              {row.detail}
                            </span>
                          ) : null}
                        </span>
                        {row.status ? (
                          <StatusPill
                            label={t(
                              messages,
                              `links.${row.status === "ACTIVE" ? "active" : "filter.unavailable"}`,
                            )}
                            state={
                              row.status === "ACTIVE" ? "active" : "disabled"
                            }
                          />
                        ) : null}
                      </Link>
                    </th>
                    <td className="px-3 py-4 text-right type-mono text-ink">
                      {row.clicks > 0 ? (
                        <Link
                          className="text-inherit underline-offset-2 hover:text-signal hover:underline"
                          href={evidenceFor(row, "click-ledger")}
                        >
                          {formatCount(locale, row.clicks)}
                        </Link>
                      ) : (
                        formatCount(locale, row.clicks)
                      )}
                    </td>
                    <td className="px-3 py-4 text-right type-mono text-ink">
                      {row.convertedClicks > 0 ? (
                        <Link
                          className="text-inherit underline-offset-2 hover:text-signal hover:underline"
                          href={evidenceFor(row, "click-ledger")}
                        >
                          {formatCount(locale, row.convertedClicks)}
                        </Link>
                      ) : (
                        formatCount(locale, row.convertedClicks)
                      )}
                    </td>
                    <td className="px-3 py-4 text-right type-mono text-ink">
                      {row.orders > 0 ? (
                        <Link
                          className="text-inherit underline-offset-2 hover:text-signal hover:underline"
                          href={evidenceFor(row, "earnings-ledger")}
                        >
                          {formatCount(locale, row.orders)}
                        </Link>
                      ) : (
                        formatCount(locale, row.orders)
                      )}
                    </td>
                    <td className="px-3 py-4 text-right type-mono text-ink">
                      {row.convertedClicks > 0 ? (
                        <Link
                          className="text-inherit underline-offset-2 hover:text-signal hover:underline"
                          href={evidenceFor(row, "click-ledger")}
                        >
                          {formatRate(locale, row.convertedClickRate)}
                        </Link>
                      ) : (
                        formatRate(locale, row.convertedClickRate)
                      )}
                    </td>
                    {report.role === "brand" ? (
                      <td className="px-3 py-4 text-right">
                        {row.sales !== "0.00" ? (
                          <Link
                            className="text-inherit underline-offset-2 hover:text-signal hover:underline"
                            href={evidenceFor(row, "earnings-ledger")}
                          >
                            <MoneyAmount
                              size="sm"
                              value={Money.of(row.sales)}
                            />
                          </Link>
                        ) : (
                          <MoneyAmount size="sm" value={Money.of(row.sales)} />
                        )}
                      </td>
                    ) : null}
                    <td className="px-3 py-4 text-right">
                      {row.pending !== "0.00" ? (
                        <Link
                          className="text-inherit underline-offset-2 hover:text-signal hover:underline"
                          href={evidenceFor(row, "earnings-ledger", {
                            status: "PENDING",
                          })}
                        >
                          <MoneyAmount
                            size="sm"
                            tone="accrued"
                            value={Money.of(row.pending)}
                          />
                        </Link>
                      ) : (
                        <MoneyAmount
                          size="sm"
                          tone="accrued"
                          value={Money.of(row.pending)}
                        />
                      )}
                    </td>
                    <td className="px-3 py-4 text-right">
                      {row.confirmed !== "0.00" ? (
                        <Link
                          className="text-inherit underline-offset-2 hover:text-signal hover:underline"
                          href={evidenceFor(row, "earnings-ledger", {
                            status: "CONFIRMED",
                          })}
                        >
                          <MoneyAmount
                            size="sm"
                            tone="settled"
                            value={Money.of(row.confirmed)}
                          />
                        </Link>
                      ) : (
                        <MoneyAmount
                          size="sm"
                          tone="settled"
                          value={Money.of(row.confirmed)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-slate-200 md:hidden">
            {rows.map((row) => (
              <Link
                className="block py-5 text-inherit no-underline"
                href={destinationFor(row)}
                key={row.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="m-0 font-semibold text-ink">{row.label}</p>
                    {row.detail ? (
                      <p className="mb-0 mt-1 type-caption text-slate-600">
                        {row.detail}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-right">
                    <MoneyAmount
                      size="sm"
                      tone="settled"
                      value={Money.of(row.confirmed)}
                    />
                    <span className="mt-1 block type-caption text-slate-600">
                      {t(messages, "performance.metric.confirmed")}
                    </span>
                  </span>
                </div>
                {row.status ? (
                  <div className="mt-3">
                    <StatusPill
                      label={t(
                        messages,
                        `links.${row.status === "ACTIVE" ? "active" : "filter.unavailable"}`,
                      )}
                      state={row.status === "ACTIVE" ? "active" : "disabled"}
                    />
                  </div>
                ) : null}
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <dt className="type-caption text-slate-600">
                      {t(messages, "performance.metric.recordedClicks")}
                    </dt>
                    <dd className="m-0 mt-1 type-mono text-ink">
                      {formatCount(locale, row.clicks)}
                    </dd>
                  </div>
                  <div>
                    <dt className="type-caption text-slate-600">
                      {t(messages, "performance.metric.convertedClicks")}
                    </dt>
                    <dd className="m-0 mt-1 type-mono text-ink">
                      {formatCount(locale, row.convertedClicks)}
                    </dd>
                  </div>
                  <div>
                    <dt className="type-caption text-slate-600">
                      {t(messages, "performance.metric.orders")}
                    </dt>
                    <dd className="m-0 mt-1 type-mono text-ink">
                      {formatCount(locale, row.orders)}
                    </dd>
                  </div>
                  <div>
                    <dt className="type-caption text-slate-600">
                      {t(messages, "performance.metric.rate")}
                    </dt>
                    <dd className="m-0 mt-1 type-mono text-ink">
                      {formatRate(locale, row.convertedClickRate)}
                    </dd>
                  </div>
                  {report.role === "brand" ? (
                    <div>
                      <dt className="type-caption text-slate-600">
                        {t(messages, "performance.metric.sales")}
                      </dt>
                      <dd className="m-0 mt-1">
                        <MoneyAmount size="sm" value={Money.of(row.sales)} />
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="type-caption text-slate-600">
                      {t(messages, "performance.metric.pending")}
                    </dt>
                    <dd className="m-0 mt-1">
                      <MoneyAmount
                        size="sm"
                        tone="accrued"
                        value={Money.of(row.pending)}
                      />
                    </dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
          {pageCount > 1 ? (
            <nav
              aria-label={t(messages, "performance.breakdown.pagination")}
              className="mt-6 flex items-center justify-between gap-4"
            >
              {page > 1 ? (
                <Link
                  className="inline-flex min-h-11 items-center rounded-pill border border-slate-300 px-4 type-small font-semibold text-ink no-underline hover:border-ink"
                  href={performanceHref(
                    basePath,
                    state.filters,
                    state,
                    { breakdownPage: page - 1 },
                    "breakdown",
                  )}
                >
                  {t(messages, "catalog.pagination.previous")}
                </Link>
              ) : (
                <span />
              )}
              <span className="type-small text-slate-600">
                {t(messages, "catalog.pagination.page")} {page}{" "}
                {t(messages, "catalog.pagination.of")} {pageCount}
              </span>
              {page < pageCount ? (
                <Link
                  className="inline-flex min-h-11 items-center rounded-pill border border-slate-300 px-4 type-small font-semibold text-ink no-underline hover:border-ink"
                  href={performanceHref(
                    basePath,
                    state.filters,
                    state,
                    { breakdownPage: page + 1 },
                    "breakdown",
                  )}
                >
                  {t(messages, "catalog.pagination.next")}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      )}
    </section>
  );
}

export function PerformanceDashboard({
  report,
  state,
  locale,
  messages,
  basePath,
}: {
  report: PerformanceReport;
  state: PerformancePageState;
  locale: Locale;
  messages: Messages;
  basePath: string;
}) {
  if (report.scope.links === 0)
    return (
      <EmptyState
        body={t(messages, `performance.empty.${report.role}.body`)}
        title={t(messages, `performance.empty.${report.role}.title`)}
      />
    );
  return (
    <div className="grid" data-performance-workspace="performance-pulse">
      <PerformanceFilters
        basePath={basePath}
        messages={messages}
        role={report.role}
        roleOptions={
          report.role === "creator"
            ? report.options.brands
            : report.options.creators
        }
        state={state}
      />
      <section className="pt-8" aria-labelledby="performance-statement">
        <h2
          className="m-0 max-w-[28ch] type-h2 text-ink"
          id="performance-statement"
        >
          {statementFor(report, locale, messages)}
        </h2>
        <p className="mb-0 mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-slate-600">
          <Link
            className="text-inherit no-underline hover:underline"
            href={performanceHref(
              basePath,
              state.filters,
              state,
              { status: "CONFIRMED", ledgerPage: undefined },
              "earnings-ledger",
            )}
          >
            <MoneyAmount
              size="sm"
              tone="settled"
              value={Money.of(report.totals.confirmed)}
            />{" "}
            {t(messages, "performance.metric.confirmed").toLowerCase()}
          </Link>
          <span aria-hidden="true">·</span>
          <Link
            className="text-inherit no-underline hover:underline"
            href={performanceHref(
              basePath,
              state.filters,
              state,
              { status: "PENDING", ledgerPage: undefined },
              "earnings-ledger",
            )}
          >
            <MoneyAmount
              size="sm"
              tone="accrued"
              value={Money.of(report.totals.pending)}
            />{" "}
            {t(messages, "performance.metric.pending").toLowerCase()}
          </Link>
        </p>
        <p className="mb-0 mt-2 type-caption text-slate-600">
          {t(messages, "performance.confirmedNotPaid")}
        </p>
        {report.totals.cancelled !== "0.00" ? (
          <Link
            className="mb-0 mt-2 inline-flex items-center gap-1 type-caption text-reversed no-underline hover:underline"
            href={performanceHref(
              basePath,
              state.filters,
              state,
              { status: "CANCELLED", ledgerPage: undefined },
              "earnings-ledger",
            )}
          >
            <MoneyAmount
              size="sm"
              tone="reversed"
              value={Money.of(report.totals.cancelled)}
            />
            {t(messages, "performance.cancelledSummary")}
          </Link>
        ) : null}
        <p className="mb-0 mt-3 type-small text-slate-600">
          {t(messages, `performance.scope.${report.role}`)
            .replace(
              "{primary}",
              String(
                report.role === "creator"
                  ? report.scope.brands
                  : report.scope.creators,
              ),
            )
            .replace("{links}", String(report.scope.links))}
        </p>
        <MetricRail
          basePath={basePath}
          locale={locale}
          messages={messages}
          report={report}
          state={state}
        />
      </section>
      <PerformanceTrend
        basePath={basePath}
        locale={locale}
        messages={messages}
        metric={state.metric}
        points={report.trend}
        state={state}
      />
      <Breakdown
        basePath={basePath}
        locale={locale}
        messages={messages}
        report={report}
        state={state}
      />
      <ClickLedger
        basePath={basePath}
        locale={locale}
        messages={messages}
        report={report}
        state={state}
      />
      <EarningsLedger
        basePath={basePath}
        locale={locale}
        messages={messages}
        report={report}
        state={state}
      />
    </div>
  );
}
