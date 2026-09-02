import Link from "next/link";
import { EmptyState, StatusPill } from "@/src/modules/design-system";
import { t, type Locale, type Messages } from "@/src/modules/localization";
import type { PerformancePageState } from "../application/performance-query";
import type { ClickLedgerRow, PerformanceReport } from "../ports/performance";
import { performanceHref } from "./performance-links";

function clickState(row: ClickLedgerRow) {
  if (row.orderIds.length > 0) return "converted" as const;
  if (!row.creditable) return "notCreditable" as const;
  return "recorded" as const;
}

function OrderEvidence({
  row,
  basePath,
  state,
}: {
  row: ClickLedgerRow;
  basePath: string;
  state: PerformancePageState;
}) {
  if (row.orderIds.length === 0) return <>—</>;
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-1">
      {row.orderIds.map((order) => (
        <Link
          className="text-signal underline-offset-2 hover:underline"
          href={performanceHref(
            basePath,
            state.filters,
            state,
            { q: order, ledgerPage: undefined },
            "earnings-ledger",
          )}
          key={order}
        >
          #{order}
        </Link>
      ))}
    </span>
  );
}

export function ClickLedger({
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
  const dates = new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tbilisi",
  });
  const rows = report.clickLedger.rows;
  return (
    <section
      aria-labelledby="click-ledger-title"
      className="border-b border-slate-200 py-8"
      id="click-ledger"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[70ch]">
          <h2 className="m-0 type-h2 text-ink" id="click-ledger-title">
            {t(messages, "performance.clickLedger.title")}
          </h2>
          <p className="mb-0 mt-2 type-small text-slate-600">
            {t(messages, "performance.clickLedger.intro")}
          </p>
        </div>
        <p className="m-0 type-small text-slate-600">
          {t(messages, "performance.clickLedger.results").replace(
            "{count}",
            String(report.clickLedger.total),
          )}
        </p>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          body={t(messages, "performance.clickLedger.emptyBody")}
          title={t(messages, "performance.clickLedger.emptyTitle")}
        />
      ) : (
        <>
          <div
            aria-label={t(messages, "performance.clickLedger.caption")}
            className="hidden max-w-full overflow-x-auto md:block"
            role="region"
            tabIndex={0}
          >
            <table className="w-full min-w-[860px] border-collapse text-left type-small">
              <caption className="sr-only">
                {t(messages, "performance.clickLedger.caption")}
              </caption>
              <thead>
                <tr className="border-b border-slate-300 text-slate-600">
                  <th className="px-3 py-3 font-semibold" scope="col">
                    {t(messages, "orders.date")}
                  </th>
                  <th className="px-3 py-3 font-semibold" scope="col">
                    {t(messages, "performance.clickLedger.click")}
                  </th>
                  <th className="px-3 py-3 font-semibold" scope="col">
                    {t(messages, "performance.filter.product")}
                  </th>
                  <th className="px-3 py-3 font-semibold" scope="col">
                    {report.role === "creator"
                      ? t(messages, "performance.filter.brand")
                      : t(messages, "performance.filter.creator")}
                  </th>
                  <th className="px-3 py-3 font-semibold" scope="col">
                    {t(messages, "performance.filter.status")}
                  </th>
                  <th className="px-3 py-3 font-semibold" scope="col">
                    {t(messages, "performance.clickLedger.orders")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const rowState = clickState(row);
                  return (
                    <tr
                      className="border-b border-slate-200 last:border-b-0"
                      key={row.id}
                    >
                      <td className="px-3 py-4 text-slate-600">
                        {dates.format(new Date(row.occurredAt))}
                      </td>
                      <td className="px-3 py-4">
                        <span className="block type-mono text-ink">
                          {row.id}
                        </span>
                        <span className="mt-1 block type-mono text-slate-600">
                          {row.linkCode}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-ink">{row.productTitle}</td>
                      <td className="px-3 py-4 text-ink">
                        {report.role === "creator"
                          ? row.brandName
                          : row.creatorName}
                      </td>
                      <td className="px-3 py-4">
                        <StatusPill
                          label={t(
                            messages,
                            `performance.clickLedger.${rowState}`,
                          )}
                          state={
                            rowState === "converted" ? "active" : "disabled"
                          }
                        />
                      </td>
                      <td className="px-3 py-4 type-mono text-ink">
                        <OrderEvidence
                          basePath={basePath}
                          row={row}
                          state={state}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-slate-200 md:hidden">
            {rows.map((row) => {
              const rowState = clickState(row);
              return (
                <article className="py-5 first:pt-0" key={row.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 break-all type-mono text-ink">
                        {row.id}
                      </p>
                      <p className="mb-0 mt-1 type-caption text-slate-600">
                        {dates.format(new Date(row.occurredAt))}
                      </p>
                    </div>
                    <StatusPill
                      label={t(messages, `performance.clickLedger.${rowState}`)}
                      state={rowState === "converted" ? "active" : "disabled"}
                    />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 type-small">
                    <div>
                      <dt className="type-caption text-slate-600">
                        {t(messages, "performance.filter.product")}
                      </dt>
                      <dd className="m-0 mt-1 text-ink">{row.productTitle}</dd>
                    </div>
                    <div>
                      <dt className="type-caption text-slate-600">
                        {report.role === "creator"
                          ? t(messages, "performance.filter.brand")
                          : t(messages, "performance.filter.creator")}
                      </dt>
                      <dd className="m-0 mt-1 text-ink">
                        {report.role === "creator"
                          ? row.brandName
                          : row.creatorName}
                      </dd>
                    </div>
                    <div>
                      <dt className="type-caption text-slate-600">
                        {t(messages, "performance.filter.link")}
                      </dt>
                      <dd className="m-0 mt-1 type-mono text-ink">
                        {row.linkCode}
                      </dd>
                    </div>
                    <div>
                      <dt className="type-caption text-slate-600">
                        {t(messages, "performance.clickLedger.orders")}
                      </dt>
                      <dd className="m-0 mt-1 type-mono text-ink">
                        <OrderEvidence
                          basePath={basePath}
                          row={row}
                          state={state}
                        />
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
          {report.clickLedger.pageCount > 1 ? (
            <nav
              aria-label={t(messages, "performance.clickLedger.pagination")}
              className="mt-6 flex items-center justify-between gap-4"
            >
              {report.clickLedger.page > 1 ? (
                <Link
                  className="inline-flex min-h-11 items-center rounded-pill border border-slate-300 px-4 type-small font-semibold text-ink no-underline hover:border-ink"
                  href={performanceHref(
                    basePath,
                    state.filters,
                    state,
                    { clickPage: report.clickLedger.page - 1 },
                    "click-ledger",
                  )}
                >
                  {t(messages, "catalog.pagination.previous")}
                </Link>
              ) : (
                <span />
              )}
              <span className="type-small text-slate-600">
                {t(messages, "catalog.pagination.page")}{" "}
                {report.clickLedger.page} {t(messages, "catalog.pagination.of")}{" "}
                {report.clickLedger.pageCount}
              </span>
              {report.clickLedger.page < report.clickLedger.pageCount ? (
                <Link
                  className="inline-flex min-h-11 items-center rounded-pill border border-slate-300 px-4 type-small font-semibold text-ink no-underline hover:border-ink"
                  href={performanceHref(
                    basePath,
                    state.filters,
                    state,
                    { clickPage: report.clickLedger.page + 1 },
                    "click-ledger",
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
