// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  AdminPerformanceQuery,
  AdminPerformanceReport,
  AdminPerformanceRow,
} from "@/src/modules/conversions";
import type { AdminPerformanceFinance } from "../ports/admin-performance-finance";
import { AdminPerformance } from "./admin-performance";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/en",
  useSearchParams: () => new URLSearchParams(),
}));

const m1 = "00000000-0000-4000-8000-0000000000b1";
const m2 = "00000000-0000-4000-8000-0000000000b2";
const m3 = "00000000-0000-4000-8000-0000000000b3";
const brandId = "00000000-0000-4000-8000-0000000000d1";
const productId = "00000000-0000-4000-8000-0000000000e1";
const metrics = {
  clicks: 12,
  salesCount: 3,
  salesValue: "300.00",
  commission: "30.00",
};
const query = (tab: AdminPerformanceQuery["tab"]): AdminPerformanceQuery => ({
  tab,
  from: "2026-10-01",
  to: "2026-10-26",
  productStatus: "ALL",
  q: "",
  sort: "sales_value",
  direction: "desc",
  page: 1,
});
const report = (
  tab: AdminPerformanceQuery["tab"],
  items: AdminPerformanceRow[] = [],
): AdminPerformanceReport => ({
  query: query(tab),
  totals: metrics,
  trend: [
    {
      from: "2026-10-01",
      to: "2026-10-26",
      salesValue: "300.00",
      commission: "30.00",
    },
  ],
  rows: { items, page: 1, pageSize: 25, total: items.length },
});
const creatorRow = (id: string, name: string): AdminPerformanceRow => ({
  id,
  name,
  kind: "creator",
  ...metrics,
});
const adminFinance: AdminPerformanceFinance = {
  period: {
    from: "2026-10-01",
    to: "2026-10-26",
    brandReceipts: "900.00",
    creatorPayouts: "500.00",
  },
  current: {
    brandOutstanding: "1.00",
    brandCredits: "2.00",
    creatorUnpaid: "3.00",
    creatorOverpayments: "4.00",
  },
  brands: [{ id: brandId, periodReceipts: "9.00", outstanding: "8.00" }],
  creators: [{ id: m1, periodPayouts: "10.00", unpaid: "5.00" }],
};
const noOptions = { brands: [], creators: [] };
const shared = {
  options: noOptions,
  locale: "en" as const,
  listPath: "/en/admin/performance",
  listPage: "1",
};

function expectNoAdminSurface(html: string) {
  expect(html).not.toContain('href="/en/admin');
  expect(html).not.toContain("/api/admin/performance/export");
  expect(screen.queryByRole("button", { name: /csv/i })).toBeNull();
  expect(html).not.toContain("Platform payments");
  expect(html).not.toContain("Brand payments received");
  expect(screen.queryByLabelText("Brand")).toBeNull();
  expect(screen.queryByLabelText("Creator")).toBeNull();
}

describe("AdminPerformance team scope", () => {
  function renderTeam() {
    return render(
      <AdminPerformance
        {...shared}
        report={report("creators", [
          creatorRow(m1, "Ana"),
          creatorRow(m2, "Beka"),
          creatorRow(m3, "Gela"),
        ])}
        finance={{
          creators: [
            { id: m1, periodPayouts: "10.00", unpaid: "5.00" },
            { id: m2, periodPayouts: "0.00", unpaid: "7.50" },
          ],
        }}
        basePath="/en/creator/team"
        scope={{
          kind: "team",
          memberPath: "/en/creator/team",
          members: [
            { id: m1, status: "APPROVED", accessDisabled: false, linkCount: 2 },
            {
              id: m2,
              status: "SUSPENDED",
              accessDisabled: false,
              linkCount: 0,
            },
            { id: m3, status: "PENDING", accessDisabled: false, linkCount: 1 },
          ],
        }}
      />,
    );
  }

  it("hides every admin-only element", () => {
    const { container } = renderTeam();
    expectNoAdminSurface(container.innerHTML);
    expect(
      screen.queryByRole("navigation", { name: "Performance views" }),
    ).toBeNull();
    expect(screen.queryByText("Manage")).toBeNull();
  });

  it("shows the team total with clicks above the member table", () => {
    renderTeam();
    expect(screen.getByRole("heading", { name: "My team" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Team total" })).toBeTruthy();
    expect(screen.getAllByText("Creditable clicks").length).toBeGreaterThan(0);
  });

  it("links each member, names status in words and shows links and payouts", () => {
    renderTeam();
    const table = screen.getByRole("table");
    const ana = within(table).getByRole("link", { name: "Ana" });
    expect(ana).toHaveAttribute("href", `/en/creator/team/${m1}`);
    const anaRow = ana.closest("tr")!;
    expect(within(anaRow).getByText("Active")).toBeTruthy();
    expect(within(anaRow).getByText("2")).toBeTruthy();
    expect(anaRow.textContent).toContain("10.00");
    expect(anaRow.textContent).toContain("5.00");
    const bekaRow = within(table)
      .getByRole("link", { name: "Beka" })
      .closest("tr")!;
    expect(within(bekaRow).getByText("Deactivated")).toBeTruthy();
    expect(bekaRow.textContent).toContain("7.50");
    const gelaRow = within(table)
      .getByRole("link", { name: "Gela" })
      .closest("tr")!;
    expect(within(gelaRow).getByText("Pending")).toBeTruthy();
    expect(within(table).getByText("Paid in period")).toBeTruthy();
    expect(within(table).getByText("Unpaid (all time)")).toBeTruthy();
  });

  it("names an access-disabled member as deactivated", () => {
    render(
      <AdminPerformance
        {...shared}
        report={report("creators", [creatorRow(m1, "Ana")])}
        finance={{ creators: [] }}
        basePath="/en/creator/team"
        scope={{
          kind: "team",
          memberPath: "/en/creator/team",
          members: [
            { id: m1, status: "APPROVED", accessDisabled: true, linkCount: 0 },
          ],
        }}
      />,
    );
    expect(
      within(screen.getByRole("table")).getByText("Deactivated"),
    ).toBeTruthy();
  });
});

describe("AdminPerformance team member scope", () => {
  const scope = {
    kind: "team_member" as const,
    memberName: "Ana",
    backHref: "/en/creator/team",
  };
  const memberFinance = {
    creators: [{ id: m1, periodPayouts: "10.00", unpaid: "5.00" }],
  };
  const basePath = `/en/creator/team/${m1}`;

  it("shows the member overview with their payouts and no platform figures", () => {
    const { container } = render(
      <AdminPerformance
        {...shared}
        report={{
          ...report("overview"),
          query: { ...query("overview"), creatorId: m1 },
        }}
        finance={memberFinance}
        basePath={basePath}
        scope={scope}
      />,
    );
    expectNoAdminSurface(container.innerHTML);
    expect(screen.getByRole("heading", { level: 1, name: "Ana" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Back to my team" }),
    ).toHaveAttribute("href", "/en/creator/team");
    const tabs = screen.getByRole("navigation", { name: "Performance views" });
    const links = within(tabs).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Overview",
      "Brands",
      "Products",
    ]);
    for (const link of links)
      expect(link.getAttribute("href")).toMatch(new RegExp(`^${basePath}\\?`));
    expect(screen.getByText("Paid in period")).toBeTruthy();
    expect(screen.getByText("Unpaid")).toBeTruthy();
    expect(container.textContent).toContain("10.00");
    expect(container.textContent).toContain("5.00");
  });

  it("renders product rows as plain text", () => {
    const { container } = render(
      <AdminPerformance
        {...shared}
        report={report("products", [
          {
            id: productId,
            name: "Candle",
            kind: "product",
            sku: "SKU-1",
            brandId,
            brandName: "Shop",
            status: "ACTIVE",
            ...metrics,
          },
        ])}
        finance={memberFinance}
        basePath={basePath}
        scope={scope}
      />,
    );
    expectNoAdminSurface(container.innerHTML);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Candle")).toBeTruthy();
    expect(within(table).queryByRole("link", { name: "Candle" })).toBeNull();
    expect(within(table).queryByRole("link", { name: "Shop" })).toBeNull();
  });

  it("shows the brands tab without financial columns", () => {
    const { container } = render(
      <AdminPerformance
        {...shared}
        report={report("brands", [
          { id: brandId, name: "Shop", kind: "brand", ...metrics },
        ])}
        finance={memberFinance}
        basePath={basePath}
        scope={scope}
      />,
    );
    expectNoAdminSurface(container.innerHTML);
    const table = screen.getByRole("table");
    expect(within(table).queryByRole("link", { name: "Shop" })).toBeNull();
    expect(table.textContent).not.toContain("Account payments");
    expect(table.textContent).not.toContain("Account balance");
    expect(table.textContent).not.toContain("Account-wide finance");
  });
});

describe("AdminPerformance without a scope", () => {
  it("keeps the admin overview, tabs, export and pickers", () => {
    const { container } = render(
      <AdminPerformance
        {...shared}
        options={{
          brands: [{ id: brandId, name: "Shop" }],
          creators: [{ id: m1, name: "Ana" }],
        }}
        report={report("overview")}
        finance={adminFinance}
        basePath="/en/admin/performance"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Platform performance" }),
    ).toBeTruthy();
    expect(screen.getByText("Platform payments")).toBeTruthy();
    expect(
      within(
        screen.getByRole("navigation", { name: "Performance views" }),
      ).getAllByRole("link"),
    ).toHaveLength(4);
    expect(container.innerHTML).toContain('href="/en/admin/performance?');
    expect(screen.getAllByLabelText("Brand").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Creator").length).toBeGreaterThan(0);
  });

  it("keeps account links and the manage column on the creators tab", () => {
    render(
      <AdminPerformance
        {...shared}
        report={report("creators", [creatorRow(m1, "Ana")])}
        finance={adminFinance}
        basePath="/en/admin/performance"
      />,
    );
    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("link", { name: "Ana" }).getAttribute("href"),
    ).toMatch(/^\/en\/admin\/performance\?/);
    expect(within(table).getByText("Manage")).toBeTruthy();
    expect(
      within(table).getByRole("link", { name: "Finance" }),
    ).toHaveAttribute("href", `/en/admin/finance/creator/${m1}`);
  });
});
