import Link from "next/link";
import { t, type Locale, type Messages } from "@/src/modules/localization";
import type {
  PerformanceMetric,
  PerformancePageState,
} from "../application/performance-query";
import type { PerformanceTrendPoint } from "../ports/performance";
import { performanceHref } from "./performance-links";

const WIDTH = 1000;
const HEIGHT = 220;
const PADDING_X = 56;
const PADDING_Y = 24;

const MONTHS = {
  en: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  ka: [
    "იან",
    "თებ",
    "მარ",
    "აპრ",
    "მაი",
    "ივნ",
    "ივლ",
    "აგვ",
    "სექ",
    "ოქტ",
    "ნოე",
    "დეკ",
  ],
} as const;

function calendarLabel(date: string, locale: Locale) {
  const [, month = "01", day = "01"] = date.split("-");
  return `${Number(day)} ${MONTHS[locale][Number(month) - 1] ?? month}`;
}

export function PerformanceTrend({
  points,
  metric,
  locale,
  messages,
  basePath,
  state,
}: {
  points: readonly PerformanceTrendPoint[];
  metric: PerformanceMetric;
  locale: Locale;
  messages: Messages;
  basePath: string;
  state: PerformancePageState;
}) {
  const values = points.map((point) =>
    metric === "clicks"
      ? point.clicks
      : metric === "orders"
        ? point.orders
        : Number(point.earnings),
  );
  const maximum = Math.max(...values, 0);
  const plotHeight = HEIGHT - PADDING_Y * 2;
  const plotWidth = WIDTH - PADDING_X * 2;
  const x = (index: number) =>
    PADDING_X +
    (points.length < 2 ? 0 : (index / (points.length - 1)) * plotWidth);
  const y = (value: number) =>
    PADDING_Y +
    plotHeight -
    (maximum === 0 ? 0 : (value / maximum) * plotHeight);
  const path = values
    .map(
      (value, index) =>
        `${index === 0 ? "M" : "L"}${x(index).toFixed(2)},${y(value).toFixed(2)}`,
    )
    .join(" ");
  const formatValue = (value: number) =>
    metric === "earnings"
      ? `${new Intl.NumberFormat(locale === "ka" ? "ka-GE" : "en-GB", {
          maximumFractionDigits: 2,
        }).format(value)} ₾`
      : new Intl.NumberFormat(locale === "ka" ? "ka-GE" : "en-GB").format(
          value,
        );
  const labelIndices = [
    ...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]),
  ].filter((index) => index >= 0);
  return (
    <section
      className="border-b border-slate-200 py-7"
      aria-labelledby="trend-title"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="m-0 type-h3 text-ink" id="trend-title">
            {t(messages, "performance.trend.title")}
          </h2>
          <p className="mb-0 mt-1 type-small text-slate-600">
            {state.filters.period === "all"
              ? t(messages, "performance.trend.allTimeNote")
              : t(messages, "performance.trend.periodNote")}
          </p>
        </div>
        <nav
          aria-label={t(messages, "performance.trend.metric")}
          className="inline-flex overflow-hidden rounded-sm border border-slate-300 bg-paper"
        >
          {(["clicks", "orders", "earnings"] as const).map((value) => (
            <Link
              aria-current={metric === value ? "page" : undefined}
              className={`inline-flex min-h-11 items-center border-r border-slate-300 px-4 type-small font-semibold no-underline last:border-r-0 ${metric === value ? "bg-signal-50 text-signal" : "text-slate-600 hover:bg-slate-50 hover:text-ink"}`}
              href={performanceHref(
                basePath,
                state.filters,
                state,
                { metric: value },
                "trend",
              )}
              key={value}
            >
              {t(messages, `performance.metric.${value}`)}
            </Link>
          ))}
        </nav>
      </div>
      {maximum === 0 ? (
        <div className="grid min-h-44 place-items-center rounded-sm bg-slate-50 px-6 text-center type-small text-slate-600">
          {t(messages, "performance.trend.empty")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm bg-slate-50 px-2 py-3">
          <svg
            aria-labelledby="trend-svg-title trend-svg-description"
            className="block h-auto w-full"
            role="img"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          >
            <title id="trend-svg-title">
              {t(messages, `performance.metric.${metric}`)}
            </title>
            <desc id="trend-svg-description">
              {t(messages, "performance.trend.description")}
            </desc>
            {[0, 0.5, 1].map((portion) => {
              const lineY = PADDING_Y + plotHeight * portion;
              const tickValue = maximum * (1 - portion);
              return (
                <g key={portion}>
                  <text
                    fill="var(--color-slate-600)"
                    fontSize="12"
                    textAnchor="end"
                    x={PADDING_X - 10}
                    y={lineY + 4}
                  >
                    {formatValue(tickValue)}
                  </text>
                  <line
                    stroke="var(--color-slate-200)"
                    strokeDasharray="4 6"
                    x1={PADDING_X}
                    x2={WIDTH - PADDING_X}
                    y1={lineY}
                    y2={lineY}
                  />
                </g>
              );
            })}
            <path
              d={path}
              fill="none"
              stroke="var(--color-signal)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            {values.map((value, index) =>
              value === 0 ? null : (
                <circle
                  aria-hidden="true"
                  cx={x(index)}
                  cy={y(value)}
                  fill="var(--color-paper)"
                  key={points[index]?.date}
                  r="3.5"
                  stroke="var(--color-signal)"
                  strokeWidth="2"
                />
              ),
            )}
            {labelIndices.map((index) => {
              const point = points[index];
              if (!point) return null;
              return (
                <text
                  fill="var(--color-slate-600)"
                  fontSize="12"
                  key={point.date}
                  textAnchor={
                    index === 0
                      ? "start"
                      : index === points.length - 1
                        ? "end"
                        : "middle"
                  }
                  x={x(index)}
                  y={HEIGHT - 3}
                >
                  {calendarLabel(point.date, locale)}
                </text>
              );
            })}
          </svg>
          <table className="sr-only">
            <caption>{t(messages, "performance.trend.description")}</caption>
            <thead>
              <tr>
                <th scope="col">{t(messages, "orders.date")}</th>
                <th scope="col">
                  {t(messages, `performance.metric.${metric}`)}
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((point, index) => (
                <tr key={point.date}>
                  <th scope="row">{calendarLabel(point.date, locale)}</th>
                  <td>{formatValue(values[index] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
