import type { Locale } from "@/src/modules/localization";
import type { AdminPerformanceReport } from "@/src/modules/conversions";
import { financeText, financeMoney, financeDate } from "./finance-copy";
export function AdminPerformanceTrend({
  trend,
  locale,
}: {
  trend: AdminPerformanceReport["trend"];
  locale: Locale;
}) {
  const t = financeText(locale);
  return (
    <div className="finance-trend-grid">
      {(["salesValue", "commission"] as const).map((metric) => {
        const label =
          metric === "salesValue"
            ? t("Sales value (GEL)", "გაყიდვების ღირებულება (GEL)")
            : t("Commission (GEL)", "საკომისიო (GEL)");
        const max = Math.max(1, ...trend.map((p) => Number(p[metric]))),
          top = Math.ceil(max / 4) * 4;
        const point = (i: number) => ({
          x: 58 + (trend.length === 1 ? 218 : (i / (trend.length - 1)) * 436),
          y: 210 - (Number(trend[i]![metric]) / top) * 174,
        });
        const coords = trend
          .map((_, i) => `${point(i).x},${point(i).y}`)
          .join(" ");
        const ticks = [
          ...new Set([
            0,
            Math.floor((trend.length - 1) / 3),
            Math.floor(((trend.length - 1) * 2) / 3),
            trend.length - 1,
          ]),
        ].filter((i) => i >= 0);
        return (
          <section
            className={`finance-panel finance-chart ${metric}`}
            key={metric}
          >
            <h2>{label}</h2>
            <p>
              {t(
                "Selected dates · Asia/Tbilisi",
                "არჩეული თარიღები · Asia/Tbilisi",
              )}
            </p>
            <svg viewBox="0 0 530 262" role="img" aria-label={label}>
              <title>{label}</title>
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i}>
                  <line
                    x1="58"
                    x2="494"
                    y1={210 - i * 43.5}
                    y2={210 - i * 43.5}
                    className="finance-gridline"
                  />
                  <text x="48" y={214 - i * 43.5} textAnchor="end">
                    {new Intl.NumberFormat(locale, {
                      maximumFractionDigits: 0,
                      notation: top > 100000 ? "compact" : "standard",
                    }).format((top * i) / 4)}
                  </text>
                </g>
              ))}
              <polygon
                points={`58,210 ${coords} 494,210`}
                className="finance-chart-area"
              />
              <polyline points={coords} className="finance-chart-line" />
              {trend.map((p, i) => (
                <circle
                  key={p.from}
                  cx={point(i).x}
                  cy={point(i).y}
                  r="3"
                  className="finance-chart-point"
                >
                  <title>
                    {`${p.from} — ${p.to} · ${label}: ${financeMoney(p[metric], locale)}`}
                  </title>
                </circle>
              ))}
              {ticks.map((i) => (
                <text key={i} x={point(i).x} y="235" textAnchor="middle">
                  {new Intl.DateTimeFormat(locale, {
                    day: "numeric",
                    month: "short",
                    timeZone: "Asia/Tbilisi",
                  }).format(new Date(trend[i]!.from))}
                </text>
              ))}
              <text x="275" y="258" textAnchor="middle">
                {t("Date", "თარიღი")}
              </text>
            </svg>
            <details className="finance-chart-data">
              <summary>{t("View chart data", "დიაგრამის მონაცემები")}</summary>
              <table>
                <thead>
                  <tr>
                    <th>{t("Dates", "თარიღები")}</th>
                    <th>{label}</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((p) => (
                    <tr key={p.from}>
                      <td>
                        {financeDate(p.from, locale)} —{" "}
                        {financeDate(p.to, locale)}
                      </td>
                      <td>{financeMoney(p[metric], locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>
        );
      })}
    </div>
  );
}
