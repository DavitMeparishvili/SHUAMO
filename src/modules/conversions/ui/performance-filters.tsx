"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Field, Select } from "@/src/modules/design-system";
import { t, type Messages } from "@/src/modules/localization";
import type { PerformancePageState } from "../application/performance-query";
import type {
  PerformanceFilterOption,
  PerformanceRole,
} from "../ports/performance";
import type { PerformancePeriod } from "../domain/performance-period";

export function PerformanceFilters({
  role,
  roleOptions,
  state,
  basePath,
  messages,
}: {
  role: PerformanceRole;
  roleOptions: readonly PerformanceFilterOption[];
  state: PerformancePageState;
  basePath: string;
  messages: Messages;
}) {
  const { filters } = state;
  const roleName = role === "creator" ? "brand" : "creator";
  const [period, setPeriod] = useState<PerformancePeriod>(filters.period);
  const hasAdvancedFilters = Boolean(
    filters.from ||
    filters.to ||
    filters.brandId ||
    filters.creatorId ||
    filters.productId ||
    filters.linkId ||
    filters.status ||
    filters.ledgerQuery,
  );
  return (
    <form className="border-y border-slate-200 py-5" method="get">
      <input name="view" type="hidden" value={state.breakdown} />
      <input name="metric" type="hidden" value={state.metric} />
      {filters.productId ? (
        <input name="product" type="hidden" value={filters.productId} />
      ) : null}
      {filters.linkId ? (
        <input name="link" type="hidden" value={filters.linkId} />
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-56">
          <Select
            id="performance-period"
            label={t(messages, "performance.filter.period")}
            name="period"
            onChange={(event) =>
              setPeriod(event.currentTarget.value as PerformancePeriod)
            }
            value={period}
          >
            <option value="7d">{t(messages, "performance.period.7d")}</option>
            <option value="30d">{t(messages, "performance.period.30d")}</option>
            <option value="90d">{t(messages, "performance.period.90d")}</option>
            <option value="custom">
              {t(messages, "performance.period.custom")}
            </option>
            <option value="all">{t(messages, "performance.period.all")}</option>
          </Select>
        </div>
        <div className="flex min-h-11 items-center gap-2">
          <Button type="submit">
            {t(messages, "performance.filter.apply")}
          </Button>
          <Link
            className="inline-flex min-h-11 items-center px-3 type-small font-semibold text-slate-600 hover:text-ink"
            href={basePath}
          >
            {t(messages, "performance.filter.clear")}
          </Link>
        </div>
      </div>
      {period === "custom" ? (
        <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-2">
          <Field
            defaultValue={filters.from}
            hint={t(messages, "performance.filter.customHint")}
            id="performance-from"
            label={t(messages, "performance.filter.from")}
            name="from"
            required
            type="date"
          />
          <Field
            defaultValue={filters.to}
            id="performance-to"
            label={t(messages, "performance.filter.to")}
            name="to"
            required
            type="date"
          />
        </div>
      ) : null}
      <details
        className="group mt-4 border-t border-slate-200 pt-4"
        open={hasAdvancedFilters || period === "custom"}
      >
        <summary className="inline-flex min-h-11 cursor-pointer items-center type-small font-semibold text-signal">
          {t(messages, "performance.filter.more")}
          {hasAdvancedFilters
            ? ` · ${t(messages, "performance.filter.active")}`
            : ""}
        </summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:items-end">
          <Select
            defaultValue={
              role === "creator" ? filters.brandId : filters.creatorId
            }
            id={`performance-${roleName}`}
            label={t(messages, `performance.filter.${roleName}`)}
            name={roleName}
          >
            <option value="">
              {t(
                messages,
                `performance.filter.all${roleName === "brand" ? "Brands" : "Creators"}`,
              )}
            </option>
            {roleOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            defaultValue={filters.status}
            hint={t(messages, "performance.filter.statusHint")}
            id="performance-status"
            label={t(messages, "performance.filter.status")}
            name="status"
          >
            <option value="">
              {t(messages, "performance.filter.allStatuses")}
            </option>
            <option value="PENDING">
              {t(messages, "orders.status.pending")}
            </option>
            <option value="CONFIRMED">
              {t(messages, "orders.status.confirmed")}
            </option>
            <option value="CANCELLED">
              {t(messages, "orders.status.cancelled")}
            </option>
          </Select>
          <p className="m-0 self-center type-small text-slate-600 md:col-span-1 xl:col-span-3">
            {t(messages, "performance.filter.sourceHint")}
          </p>
          <div className="md:col-span-2 xl:col-span-4">
            <Field
              className="max-w-xl"
              defaultValue={filters.ledgerQuery}
              id="performance-ledger-search"
              label={t(messages, "performance.filter.search")}
              name="q"
              placeholder={t(messages, "performance.filter.searchPlaceholder")}
              type="search"
            />
          </div>
        </div>
      </details>
    </form>
  );
}
