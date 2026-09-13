import { it, expect, vi } from "vitest";
import { createAdminPerformanceExport } from "./admin-performance-export";
import type { AdminPerformanceRepository } from "@/src/modules/conversions";
import type { Viewer } from "@/src/modules/identity";
function setup(viewer: Viewer = { kind: "admin", userId: "a" }) {
  const reports = {
    report: vi.fn(),
    productReport: vi.fn(),
    exportRows: vi.fn().mockResolvedValue({ rows: [], total: 0, limit: 10000 }),
    options: vi.fn(),
  } satisfies AdminPerformanceRepository;
  const finance = vi
    .fn()
    .mockResolvedValue({
      period: { brandReceipts: "0.00", creatorPayouts: "0.00" },
      current: {
        brandOutstanding: "0.00",
        brandCredits: "0.00",
        creatorUnpaid: "0.00",
        creatorOverpayments: "0.00",
      },
      brands: [],
      creators: [],
    });
  return {
    reports,
    finance,
    handle: createAdminPerformanceExport({
      viewer: async () => viewer,
      reports,
      finance,
    }),
  };
}
it.each<[Viewer, number]>([
  [{ kind: "anonymous" }, 401],
  [
    {
      kind: "brand",
      userId: "b",
      brandId: "b",
      brandName: "b",
      isAdmin: false,
    },
    403,
  ],
  [
    {
      kind: "creator",
      userId: "c",
      creatorId: "c",
      displayName: "c",
      isAdmin: false,
    },
    403,
  ],
])("authorizes direct requests before any read %j", async (viewer, status) => {
  const s = setup(viewer);
  expect(
    (await s.handle(new Request("http://test/api?scope=products"))).status,
  ).toBe(status);
  expect(s.reports.exportRows).not.toHaveBeenCalled();
});
it("exports all rows, ignores page, and enforces overflow without attachment", async () => {
  const s = setup();
  const response = await s.handle(
    new Request("http://test/api?scope=products&page=2"),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(s.reports.exportRows.mock.calls[0]?.[1]).toMatchObject({
    page: 1,
    tab: "products",
  });
  s.reports.exportRows.mockResolvedValueOnce({
    rows: [],
    total: 10001,
    limit: 10000,
  });
  const large = await s.handle(new Request("http://test/api?scope=products"));
  expect(large.status).toBe(422);
  expect(large.headers.has("content-disposition")).toBe(false);
  expect(await large.json()).toEqual({
    error: "export_too_large",
    total: 10001,
    limit: 10000,
  });
});
it("validates scope, duplicate filters and product identity", async () => {
  const s = setup();
  for (const query of [
    "scope=bad",
    "scope=products&brandId=bad",
    "scope=products&brandId=x&brandId=y",
    "scope=product_creators",
  ])
    expect(
      (await s.handle(new Request(`http://test/api?${query}`))).status,
    ).toBe(400);
  expect(
    (
      await s.handle(
        new Request(
          `http://test/api?scope=product_creators&productId=${crypto.randomUUID()}`,
        ),
      )
    ).status,
  ).toBe(404);
});
