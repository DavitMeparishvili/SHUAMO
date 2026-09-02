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
  EarningsLedgerRow,
  PerformanceReport,
} from "../ports/performance";
import { performanceHref } from "./performance-links";

function LedgerSource({
  row,
  role,
  messages,
  basePath,
  state,
}: {
  row: EarningsLedgerRow;
  role: PerformanceReport["role"];
  messages: Messages;
  basePath: string;
  state: PerformancePageState;
}) {
  return (
    <details className="group">
      <summary className="cursor-pointer type-small font-semibold text-signal">
        {t(messages, "performance.ledger.trace")}
      </summary>
      <dl className="mt-3 grid gap-2 type-caption text-slate-600">
        <div>
          <dt className="inline font-semibold text-ink">
            {t(messages, "performance.ledger.link")}:{" "}
          </dt>
          <dd className="inline">
            <Link
              className="type-mono text-signal"
              href={performanceHref(
                basePath,
                state.filters,
                state,
                { link: row.linkId, ledgerPage: undefined },
                "breakdown",
              )}
            >
              {row.linkCode}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink">
            {t(messages, "performance.ledger.click")}:{" "}
          </dt>
          <dd className="inline break-all type-mono">{row.clickId}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink">
            {t(messages, "performance.ledger.net")}:{" "}
          </dt>
          <dd className="inline">
            <MoneyAmount size="sm" value={Money.of(row.commissionableNet)} />
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink">
            {t(messages, "orders.quantity")}:{" "}
          </dt>
          <dd className="inline type-mono text-ink">{row.quantity}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink">
            {role === "creator"
              ? t(messages, "performance.filter.brand")
              : t(messages, "performance.filter.creator")}
            :{" "}
          </dt>
          <dd className="inline">
            {role === "creator" ? row.brandName : row.creatorName}
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink">
            {t(messages, "performance.ledger.timezone")}:{" "}
          </dt>
          <dd className="inline">GMT+4</dd>
        </div>
      </dl>
    </details>
  );
}

export function EarningsLedger({
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
    timeZone: "Asia/Tbilisi",
  });
  const rows = report.ledger.rows;
  return (
    <section
      className="pt-8"
      id="earnings-ledger"
      aria-labelledby="ledger-title"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[70ch]">
          <h2 className="m-0 type-h2 text-ink" id="ledger-title">
            {t(messages, "performance.ledger.title")}
          </h2>
          <p className="mb-0 mt-2 type-small text-slate-600">
            {t(messages, "performance.ledger.intro")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p className="m-0 type-small text-slate-600">
            {t(messages, "performance.ledger.results").replace(
              "{count}",
              String(report.ledger.total),
            )}
          </p>
          <Link
            className="inline-flex min-h-11 items-center type-small font-semibold text-signal no-underline hover:underline"
            download
            href={performanceHref(
              "/api/performance/export",
              state.filters,
              state,
              { ledgerPage: undefined },
            )}
          >
            {t(messages, "performance.ledger.export")}
          </Link>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          body={
            state.filters.ledgerQuery || state.filters.status
              ? t(messages, "performance.ledger.noMatchesBody")
              : t(messages, "earnings.empty.body")
          }
          title={
            state.filters.ledgerQuery || state.filters.status
              ? t(messages, "performance.ledger.noMatchesTitle")
              : t(messages, "earnings.empty.title")
          }
        />
      ) : (
        <>
          <div
            aria-label={t(messages, "performance.ledger.caption")}
            className="hidden max-w-full overflow-x-auto rounded-sm border border-slate-200 md:block"
            role="region"
            tabIndex={0}
          >
            <table className="w-full min-w-[900px] border-collapse text-left type-small">
              <caption className="sr-only">
                {t(messages, "performance.ledger.caption")}
              </caption>
              <thead>
                <tr className="border-b border-slate-300 bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 font-semibold" scope="col">
                    {t(messages, "orders.date")}
                  </th>
                  <th className="px-4 py-3 font-semibold" scope="col">
                    {report.role === "creator"
                      ? t(messages, "performance.filter.brand")
                      : t(messages, "performance.filter.creator")}
                  </th>
                  <th className="px-4 py-3 font-semibold" scope="col">
                    {t(messages, "performance.filter.product")}
                  </th>
                  <th className="px-4 py-3 font-semibold" scope="col">
                    {t(messages, "orders.order")}
                  </th>
                  <th className="px-4 py-3 font-semibold" scope="col">
                    {t(messages, "performance.ledger.source")}
                  </th>
                  <th className="px-4 py-3 font-semibold" scope="col">
                    {t(messages, "performance.filter.status")}
                  </th>
                  <th
                    className="px-4 py-3 text-right font-semibold"
                    scope="col"
                  >
                    {t(messages, "orders.commission")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const stateName = row.status.toLowerCase() as
                    "pending" | "confirmed" | "cancelled";
                  return (
                    <tr
                      className="border-b border-slate-200 last:border-b-0"
                      key={row.id}
                    >
                      <td className="px-4 py-4 text-slate-600">
                        {dates.format(new Date(row.occurredAt))}
                      </td>
                      <td className="px-4 py-4 font-semibold text-ink">
                        {report.role === "creator"
                          ? row.brandName
                          : row.creatorName}
                      </td>
                      <td className="px-4 py-4">
                        <span className="block text-ink">
                          {row.productTitle}
                        </span>
                        <span className="mt-1 block type-mono text-slate-600">
                          {row.sku}
                        </span>
                      </td>
                      <td className="px-4 py-4 type-mono text-ink">
                        #{row.orderId}
                      </td>
                      <td className="px-4 py-4">
                        <LedgerSource
                          basePath={basePath}
                          messages={messages}
                          role={report.role}
                          row={row}
                          state={state}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <StatusPill
                          label={t(messages, `orders.status.${stateName}`)}
                          state={stateName}
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <MoneyAmount
                          size="sm"
                          tone={
                            stateName === "confirmed"
                              ? "settled"
                              : stateName === "cancelled"
                                ? "reversed"
                                : "accrued"
                          }
                          value={Money.of(row.commissionAmount)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {rows.map((row) => {
              const stateName = row.status.toLowerCase() as
                "pending" | "confirmed" | "cancelled";
              return (
                <article
                  className="border-b border-slate-200 py-5 first:pt-0"
                  key={row.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="m-0 font-semibold text-ink">
                        {row.productTitle}
                      </p>
                      <p className="mb-0 mt-1 type-small text-slate-600">
                        {report.role === "creator"
                          ? row.brandName
                          : row.creatorName}{" "}
                        · #{row.orderId}
                      </p>
                    </div>
                    <MoneyAmount
                      size="sm"
                      tone={
                        stateName === "confirmed"
                          ? "settled"
                          : stateName === "cancelled"
                            ? "reversed"
                            : "accrued"
                      }
                      value={Money.of(row.commissionAmount)}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <StatusPill
                      label={t(messages, `orders.status.${stateName}`)}
                      state={stateName}
                    />
                    <span className="type-caption text-slate-600">
                      {dates.format(new Date(row.occurredAt))}
                    </span>
                  </div>
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <LedgerSource
                      basePath={basePath}
                      messages={messages}
                      role={report.role}
                      row={row}
                      state={state}
                    />
                  </div>
                </article>
              );
            })}
          </div>
          {report.ledger.pageCount > 1 ? (
            <nav
              aria-label={t(messages, "performance.ledger.pagination")}
              className="mt-6 flex items-center justify-between gap-4"
            >
              {report.ledger.page > 1 ? (
                <Link
                  className="inline-flex min-h-11 items-center rounded-pill border border-slate-300 px-4 type-small font-semibold text-ink no-underline hover:border-ink"
                  href={performanceHref(
                    basePath,
                    state.filters,
                    state,
                    {
                      ledgerPage: report.ledger.page - 1,
                    },
                    "earnings-ledger",
                  )}
                >
                  {t(messages, "catalog.pagination.previous")}
                </Link>
              ) : (
                <span />
              )}
              <span className="type-small text-slate-600">
                {t(messages, "catalog.pagination.page")} {report.ledger.page}{" "}
                {t(messages, "catalog.pagination.of")} {report.ledger.pageCount}
              </span>
              {report.ledger.page < report.ledger.pageCount ? (
                <Link
                  className="inline-flex min-h-11 items-center rounded-pill border border-slate-300 px-4 type-small font-semibold text-ink no-underline hover:border-ink"
                  href={performanceHref(
                    basePath,
                    state.filters,
                    state,
                    {
                      ledgerPage: report.ledger.page + 1,
                    },
                    "earnings-ledger",
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
