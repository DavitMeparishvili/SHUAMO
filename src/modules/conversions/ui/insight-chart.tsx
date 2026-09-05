import {
  InsightChartClient,
  type InsightChartProps,
} from "./insight-chart-client";

export function InsightChart(props: InsightChartProps) {
  const { report, locale } = props;
  const language = locale === "ka" ? "ka-GE" : "en-GB";
  const dates = new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Tbilisi",
  });
  const amounts = new Intl.NumberFormat(language, {
    maximumFractionDigits: 2,
  });
  const values = report.trend.map((point) =>
    Number(report.role === "creator" ? point.earnings : (point.sales ?? 0)),
  );
  const max = Math.max(1, ...values);

  // Browsers can lack Georgian ICU data or use a different CLDR version.
  // Serialize localized text so hydration and interactions share the SSR labels.
  return (
    <InsightChartClient
      {...props}
      report={{ role: report.role, trend: report.trend }}
      labels={{
        dates: report.trend.map((point) =>
          dates.format(new Date(`${point.date}T12:00:00+04:00`)),
        ),
        amounts: values.map((value) => amounts.format(value)),
        ticks: Array.from({ length: 5 }, (_, i) =>
          amounts.format((max * i) / 4),
        ),
      }}
    />
  );
}
