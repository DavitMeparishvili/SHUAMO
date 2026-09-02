import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getMessages } from "@/src/modules/localization";
import type { PerformanceReport } from "../ports/performance";
import { PerformanceDashboard } from "./performance-dashboard";

const report: PerformanceReport = {
  role: "creator",
  generatedAt: "2026-09-02T12:00:00.000Z",
  period: "30d",
  totals: {
    clicks: 12,
    convertedClicks: 2,
    orders: 2,
    units: 2,
    convertedClickRate: 1 / 6,
    sales: "190.00",
    pending: "10.00",
    confirmed: "12.00",
    cancelled: "0.00",
  },
  comparison: {
    clicks: 10,
    convertedClicks: 1,
    orders: 1,
    units: 1,
    convertedClickRate: 0.1,
    sales: "90.00",
    pending: "0.00",
    confirmed: "6.00",
    cancelled: "0.00",
  },
  trend: [
    { date: "2026-09-01", clicks: 12, orders: 2, earnings: "12.00" },
    { date: "2026-09-02", clicks: 0, orders: 0, earnings: "0.00" },
  ],
  clickLedger: {
    page: 1,
    pageCount: 1,
    total: 1,
    rows: [
      {
        id: "ck_amber",
        occurredAt: "2026-09-01T09:00:00.000Z",
        creditable: true,
        brandName: "Aromashop",
        creatorName: "Nino",
        productTitle: "Amber perfume",
        linkCode: "AMBER100",
        orderIds: ["ORDER-1"],
      },
    ],
  },
  breakdowns: {
    brands: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        label: "Aromashop",
        clicks: 12,
        convertedClicks: 2,
        orders: 2,
        units: 2,
        convertedClickRate: 1 / 6,
        sales: "190.00",
        pending: "10.00",
        confirmed: "12.00",
        cancelled: "0.00",
        href: "?brand=11111111-1111-4111-8111-111111111111#breakdown",
      },
    ],
    creators: [],
    products: [],
    links: [],
  },
  ledger: {
    page: 1,
    pageCount: 1,
    total: 1,
    rows: [
      {
        id: "earning-1",
        orderId: "ORDER-1",
        occurredAt: "2026-09-01T10:00:00.000Z",
        status: "CONFIRMED",
        brandId: "11111111-1111-4111-8111-111111111111",
        brandName: "Aromashop",
        creatorId: "22222222-2222-4222-8222-222222222222",
        creatorName: "Nino",
        productId: "33333333-3333-4333-8333-333333333333",
        productTitle: "Amber perfume",
        sku: "AMBER-100",
        linkId: "44444444-4444-4444-8444-444444444444",
        linkCode: "AMBER100",
        clickId: "ck_amber",
        quantity: 1,
        commissionableNet: "100.00",
        commissionAmount: "12.00",
      },
    ],
  },
  options: {
    brands: [
      { id: "11111111-1111-4111-8111-111111111111", label: "Aromashop" },
    ],
    creators: [],
  },
  scope: {
    brands: 1,
    creators: 1,
    products: 1,
    links: 1,
  },
};

describe("PerformanceDashboard", () => {
  it("connects the result statement, breakdown, and exact earnings trail", () => {
    const html = renderToStaticMarkup(
      <PerformanceDashboard
        basePath="/en/creator/earnings"
        locale="en"
        messages={getMessages("en")}
        report={report}
        state={{
          filters: { period: "30d" },
          metric: "clicks",
          breakdown: "brands",
        }}
      />,
    );

    expect(html).toContain(
      "Your links brought 12 visits and 2 attributed orders.",
    );
    expect(html).toContain("Recorded clicks");
    expect(html).toContain("Daily trend");
    expect(html).toContain("Aromashop");
    expect(html).toContain("Earnings ledger");
    expect(html).toContain("AMBER100");
    expect(html).toContain("ck_amber");
    expect(html).toContain("Confirmed records are approved earnings");
    expect(html).toContain("vs previous period");
    expect(html).toContain("Export CSV");
    expect(html).toContain("link=44444444-4444-4444-8444-444444444444");
    expect(html).toContain("q=ORDER-1");
  });

  it("uses a deliberate first-link empty state", () => {
    const html = renderToStaticMarkup(
      <PerformanceDashboard
        basePath="/en/creator/earnings"
        locale="en"
        messages={getMessages("en")}
        report={{
          ...report,
          totals: { ...report.totals, clicks: 0, orders: 0 },
          scope: { ...report.scope, links: 0 },
        }}
        state={{
          filters: { period: "30d" },
          metric: "clicks",
          breakdown: "brands",
        }}
      />,
    );
    expect(html).toContain("No tracking links yet");
    expect(html).toContain("Create a product tracking link");
  });
});
