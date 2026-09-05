"use client";
import { useState } from "react";
import type { PerformanceReport } from "../ports/performance";
import type { PerformancePageState } from "../application/performance-query";
import { performanceHref } from "./performance-links";

export interface InsightChartProps {
  report: Pick<PerformanceReport, "role" | "trend">;
  state: PerformancePageState;
  basePath: string;
  locale: string;
}

export interface InsightChartLabels {
  dates: string[];
  amounts: string[];
  ticks: string[];
}

export function InsightChartClient({
  report,
  state,
  basePath,
  locale,
  labels,
}: InsightChartProps & { labels: InsightChartLabels }) {
  const [selected, setSelected] = useState<number | null>(null);
  const ka = locale === "ka";
  const points = report.trend;
  const value = (i: number) =>
    Number(
      report.role === "creator" ? points[i]?.earnings : (points[i]?.sales ?? 0),
    );
  const max = Math.max(1, ...points.map((_, i) => value(i)));
  const x = (i: number) => 54 + (i / Math.max(1, points.length - 1)) * 520;
  const y = (n: number) => 204 - (n / max) * 154;
  const populated = points.some((_, i) => value(i) !== 0);
  return (
    <section className="insight-panel insight-trend">
      <header>
        <h2>
          {report.role === "creator"
            ? ka
              ? "საკომისიო გაყიდვის თარიღით"
              : "Commission by sale date"
            : ka
              ? "მიკუთვნებული გაყიდვების ღირებულება"
              : "Attributed sales value"}
        </h2>
        <p>
          {points.some((p) => p.endDate)
            ? ka
              ? "პერიოდის ჯამები"
              : "Period totals"
            : ka
              ? "დღიური შედეგები"
              : "Daily results"}{" "}
          · {labels.dates[0] ?? ""} — {labels.dates.at(-1) ?? ""}
        </p>
      </header>
      {populated ? (
        <>
          <svg
            className="insight-chart"
            viewBox="0 0 610 248"
            onPointerDown={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              const chartX = ((event.clientX - box.left) / box.width) * 610;
              setSelected(
                Math.max(
                  0,
                  Math.min(
                    points.length - 1,
                    Math.round(((chartX - 54) / 520) * (points.length - 1)),
                  ),
                ),
              );
            }}
            role="group"
            aria-label={ka ? "დღიური შედეგები ლარში" : "Daily results in GEL"}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
              <g key={p}>
                <line
                  x1="54"
                  x2="574"
                  y1={y(max * p)}
                  y2={y(max * p)}
                  className="insight-grid-line"
                />
                <text x="43" y={y(max * p) + 4} textAnchor="end">
                  {labels.ticks[i]}
                </text>
              </g>
            ))}
            <text x="54" y="24">
              GEL
            </text>
            <polygon
              points={`54,204 ${points.map((_, i) => `${x(i)},${y(value(i))}`).join(" ")} 574,204`}
              fill="var(--insight-chart-fill)"
            />
            <polyline
              points={points.map((_, i) => `${x(i)},${y(value(i))}`).join(" ")}
              fill="none"
              stroke="var(--signal)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {points.map((point, i) => (
              <g key={point.date}>
                <circle
                  role="button"
                  tabIndex={0}
                  aria-label={`${labels.dates[i]}: ${labels.amounts[i]} GEL`}
                  cx={x(i)}
                  cy={y(value(i))}
                  r="12"
                  fill="transparent"
                  onClick={() => setSelected(i)}
                  onFocus={() => setSelected(i)}
                  onMouseEnter={() => setSelected(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(i);
                    }
                  }}
                />
                <circle
                  cx={x(i)}
                  cy={y(value(i))}
                  r={selected === i ? 4 : 2}
                  fill="var(--signal)"
                  pointerEvents="none"
                />
              </g>
            ))}
            {[0, Math.floor((points.length - 1) / 2), points.length - 1]
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((i) =>
                points[i] ? (
                  <text
                    key={i}
                    x={x(i)}
                    y="233"
                    textAnchor={
                      i === 0
                        ? "start"
                        : i === points.length - 1
                          ? "end"
                          : "middle"
                    }
                  >
                    {labels.dates[i]}
                  </text>
                ) : null,
              )}
          </svg>
          <div className="insight-chart-readout" aria-live="polite">
            {selected !== null && points[selected] ? (
              <>
                <span>
                  {labels.dates[selected]}{" "}
                  <strong>{labels.amounts[selected]} ₾</strong>
                </span>
                <a
                  href={performanceHref(basePath, state.filters, state, {
                    period: "custom",
                    from: points[selected]!.date,
                    to: points[selected]!.endDate ?? points[selected]!.date,
                    tab: "sales",
                    sale: undefined,
                    ledgerPage: undefined,
                  })}
                >
                  {ka ? "გაყიდვების ნახვა" : "View sales"} →
                </a>
              </>
            ) : (
              <span>
                {ka
                  ? "აირჩიეთ წერტილი დეტალებისთვის"
                  : "Select a point to explore its sales"}
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="insight-empty">
          <h3>
            {ka ? "ამ პერიოდში შედეგები არ არის" : "No results in this period"}
          </h3>
          <p>
            {ka
              ? "სცადეთ სხვა თარიღები ან გაასუფთავეთ ფილტრები."
              : "Try another date range or clear your filters."}
          </p>
          <a href={basePath}>
            {ka ? "ფილტრების გასუფთავება" : "Clear filters"}
          </a>
        </div>
      )}
    </section>
  );
}
