import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { seedBrand, seedCreator, seedLink } from "@/src/test/fixtures/accounts";
import { setOwnedBrandLinkStatus } from "@/src/modules/partnerships";
import { productWorkspaceQuery } from "../application/product-workspace-query";
import {
  brandProductCatalogue,
  brandProductCreators,
} from "./prisma-product-workspace";
import * as performance from "./prisma-performance-repository";

const now = new Date("2026-09-13T10:00:00Z");
const query = (raw: Record<string, string> = {}) => productWorkspaceQuery(raw);
async function fixture() {
  const f = await seedLink();
  await prisma.creator.update({
    where: { id: f.creator.id },
    data: { displayName: "Mari" },
  });
  const [nino, dato] = await Promise.all([seedCreator(), seedCreator()]);
  for (const [creator, name] of [
    [nino, "Nino"],
    [dato, "Dato"],
  ] as const) {
    await prisma.creator.update({
      where: { id: creator.id },
      data: { displayName: name },
    });
    await prisma.partnership.create({
      data: { brandId: f.brand.id, creatorId: creator.id, status: "APPROVED" },
    });
  }
  const links = [f.link];
  for (const [creatorId, status, rate] of [
    [f.creator.id, "DISABLED", "10"],
    [nino.id, "ACTIVE", "0.1"],
    [nino.id, "DISABLED", "10"],
    [dato.id, "ACTIVE", "0.1"],
  ] as const) {
    links.push(
      await prisma.trackingLink.create({
        data: {
          productId: f.product.id,
          creatorId,
          status,
          code: crypto.randomUUID().slice(0, 8),
          commissionType: rate === "10" ? "FIXED" : "PERCENT",
          commissionValue: rate,
          acceptedTerms: { version: 1, specialTerms: "Original terms" },
        },
      }),
    );
  }
  const empty = await prisma.product.create({
    data: {
      brandId: f.brand.id,
      sku: "EMPTY",
      title: "Without links",
      priceGel: "50",
      commissionType: "FIXED",
      commissionValue: "4",
      backlinkUrl: "https://example.ge",
    },
  });
  return { ...f, links, empty };
}
async function sale(
  f: Awaited<ReturnType<typeof fixture>>,
  index: number,
  status: "CONFIRMED" | "CANCELLED",
  at = now,
) {
  const link = f.links[index]!;
  const click = await prisma.click.create({
    data: {
      id: crypto.randomUUID(),
      brandId: f.brand.id,
      trackingLinkId: link.id,
      occurredAt: at,
    },
  });
  await prisma.conversion.create({
    data: {
      brandId: f.brand.id,
      orderId: crypto.randomUUID(),
      requestFingerprint: "a".repeat(64),
      status,
      occurredAt: at,
      confirmedAt: at,
      items: {
        create: {
          sku: f.product.sku,
          qty: 2,
          unitPrice: "90",
          lineDiscount: "10",
          lineVat: "0",
          commissionableNet: "170",
          attribution: {
            create: {
              clickId: click.id,
              creatorId: link.creatorId,
              productId: f.product.id,
              commissionAmount: "17",
            },
          },
        },
      },
    },
  });
}
describe("brand product workspace", () => {
  it("reconciles distinct creators, all historical links, period sales and cancellations with canonical performance", async () => {
    const f = await fixture();
    await sale(f, 0, "CONFIRMED");
    await sale(f, 1, "CANCELLED");
    await sale(f, 2, "CONFIRMED", new Date("2026-07-01T10:00:00Z"));
    const [catalogue, creators, canonical] = await Promise.all([
      brandProductCatalogue(f.brand.id, query(), now),
      brandProductCreators(f.brand.id, f.product.id, query(), now),
      performance.brandPerformanceReport(
        f.brand.id,
        { productId: f.product.id, period: "30d" },
        now,
      ),
    ]);
    const row = catalogue.items.find((p) => p.id === f.product.id)!;
    expect(row).toMatchObject({
      creators: 3,
      links: 5,
      active: 3,
      confirmedSales: 1,
      sales: "170.00",
    });
    expect(creators?.metrics).toEqual({
      clicks: 2,
      confirmedSales: 1,
      sales: canonical.totals.sales,
      commission: canonical.totals.confirmed,
    });
    expect(creators?.groups).toHaveLength(3); // zero-activity creators stay visible
    expect(
      creators?.groups.find((g) => g.id === f.creator.id)?.links,
    ).toHaveLength(2);
    expect(
      (
        await brandProductCreators(
          f.brand.id,
          f.product.id,
          query({ period: "all" }),
          now,
        )
      )?.metrics?.confirmedSales,
    ).toBe(2);
  });
  it("combines filters, respects facet scope and raw link states, and shows empty products", async () => {
    const f = await fixture();
    await prisma.product.update({
      where: { id: f.product.id },
      data: { status: "ARCHIVED" },
    });
    const active = await brandProductCatalogue(
      f.brand.id,
      query({ coverage: "active" }),
      now,
    );
    expect(active.items[0]?.id).toBe(f.product.id); // raw ACTIVE links, independent of archived product
    expect(active.facets).toMatchObject({
      all: 2,
      active: 1,
      none: 1,
      disabled: 0,
    });
    expect(
      (
        await brandProductCatalogue(
          f.brand.id,
          query({ coverage: "none" }),
          now,
        )
      ).items[0]?.id,
    ).toBe(f.empty.id);
    await prisma.trackingLink.updateMany({
      where: { productId: f.product.id },
      data: { status: "DISABLED" },
    });
    expect(
      (
        await brandProductCatalogue(
          f.brand.id,
          query({ coverage: "disabled" }),
          now,
        )
      ).items[0]?.id,
    ).toBe(f.product.id);
    expect(
      (
        await brandProductCatalogue(
          f.brand.id,
          query({ q: "Without", coverage: "active" }),
          now,
        )
      ).facets,
    ).toMatchObject({ all: 1, active: 0, none: 1 });
    expect(
      (await brandProductCreators(f.brand.id, f.empty.id, query(), now))
        ?.groups,
    ).toEqual([]);
  });
  it("filters name versus link code without altering product totals or historical rates", async () => {
    const f = await fixture();
    await sale(f, 0, "CONFIRMED");
    await sale(f, 1, "CONFIRMED");
    await prisma.product.update({
      where: { id: f.product.id },
      data: {
        commissionValue: "0.25",
        commissionType: "PERCENT",
        termsVersion: 9,
      },
    });
    const named = await brandProductCreators(
      f.brand.id,
      f.product.id,
      query({ cq: "Mari" }),
      now,
    );
    expect(named?.groups).toHaveLength(1);
    expect(named?.groups[0]?.matchingLinks).toBe(2);
    const coded = await brandProductCreators(
      f.brand.id,
      f.product.id,
      query({ cq: f.links[1]!.code }),
      now,
    );
    expect(coded?.matchingLinks).toBe(1);
    expect(coded?.metrics?.commission).toBe("17.00");
    expect(coded?.product).toMatchObject({
      creators: 3,
      links: 5,
      rate: "0.25",
    });
    expect(coded?.groups[0]?.links[0]).toMatchObject({
      rateType: "FIXED",
      rate: "10",
      terms: { version: 1, specialTerms: "Original terms" },
    });
    expect(
      (
        await brandProductCreators(
          f.brand.id,
          f.product.id,
          query({ cq: "Mari", cs: "DISABLED" }),
          now,
        )
      )?.matchingLinks,
    ).toBe(1);
  });
  it("paginates children without truncating aggregates, and uses stable product pagination", async () => {
    const f = await fixture();
    for (let i = 0; i < 11; i++) {
      await prisma.trackingLink.create({
        data: {
          productId: f.product.id,
          creatorId: f.creator.id,
          status: "DISABLED",
          code: crypto.randomUUID().slice(0, 8),
          commissionType: "FIXED",
          commissionValue: "10",
        },
      });
      await prisma.product.create({
        data: {
          brandId: f.brand.id,
          sku: "PAGE-" + i,
          title: "Same",
          priceGel: "50",
          commissionType: "FIXED",
          commissionValue: "4",
          backlinkUrl: "https://example.ge",
        },
      });
    }
    await sale(f, 0, "CONFIRMED");
    const first = await brandProductCreators(
      f.brand.id,
      f.product.id,
      query({ cq: "Mari" }),
      now,
    );
    const next = await brandProductCreators(
      f.brand.id,
      f.product.id,
      query({ cq: "Mari" }),
      now,
      { creatorId: f.creator.id, page: 2 },
    );
    expect(first?.groups[0]).toMatchObject({
      matchingLinks: 13,
      linkPageCount: 2,
      confirmedSales: 1,
    });
    expect(first?.groups[0]?.links).toHaveLength(10);
    expect(next?.groups[0]?.links).toHaveLength(3);
    expect(next?.metrics).toEqual(first?.metrics);
    const a = await brandProductCatalogue(
      f.brand.id,
      query({ sort: "title" }),
      now,
    );
    const b = await brandProductCatalogue(
      f.brand.id,
      query({ sort: "title", page: "2" }),
      now,
    );
    expect(a.total).toBe(13);
    expect(new Set([...a.items, ...b.items].map((p) => p.id)).size).toBe(13);
  });
  it("rejects cross-brand reads and mutations; restore preserves scope and enforces eligibility", async () => {
    const f = await fixture(),
      stranger = await seedBrand();
    expect(
      await brandProductCreators(stranger.id, f.product.id, query(), now),
    ).toBeNull();
    expect(
      await setOwnedBrandLinkStatus(stranger.id, f.link.id, "DISABLED"),
    ).toMatchObject({ ok: false, error: "not_found" });
    expect(
      await setOwnedBrandLinkStatus(f.brand.id, f.links[1]!.id, "ACTIVE"),
    ).toMatchObject({ ok: false, error: "active_link_exists" });
    expect(
      await setOwnedBrandLinkStatus(f.brand.id, f.link.id, "DISABLED"),
    ).toEqual({ ok: true });
    expect(
      await prisma.trackingLink.count({
        where: { productId: f.product.id, status: "ACTIVE" },
      }),
    ).toBe(2);
    expect(
      (await prisma.partnership.findUnique({ where: { id: f.partnership.id } }))
        ?.status,
    ).toBe("APPROVED");
    expect(
      await setOwnedBrandLinkStatus(f.brand.id, f.link.id, "ACTIVE"),
    ).toEqual({ ok: true });
    await prisma.product.update({
      where: { id: f.product.id },
      data: { status: "ARCHIVED" },
    });
    expect(
      await setOwnedBrandLinkStatus(f.brand.id, f.links[1]!.id, "ACTIVE"),
    ).toMatchObject({ ok: false, error: "product_archived" });
    expect(
      await brandProductCreators(f.brand.id, "invalid", query(), now),
    ).toBeNull();
  });
  it("keeps identity and history when metrics fail, without claiming measured zeros", async () => {
    const f = await fixture();
    const mock = vi
      .spyOn(performance, "linkActivityCtes")
      .mockImplementationOnce(() => {
        throw new Error("unavailable");
      });
    try {
      const result = await brandProductCreators(
        f.brand.id,
        f.product.id,
        query(),
        now,
      );
      expect(result).toMatchObject({
        metrics: null,
        metricsUnavailable: true,
        product: { links: 5 },
      });
      expect(result?.groups).toHaveLength(3);
      mock.mockImplementationOnce(() => {
        throw new Error("unavailable");
      });
      const catalogue = await brandProductCatalogue(f.brand.id, query(), now);
      expect(catalogue.metricsUnavailable).toBe(true);
      expect(catalogue.items).toHaveLength(2);
      expect(catalogue.items.find((p) => p.id === f.product.id)).toMatchObject({
        creators: 3,
        links: 5,
        active: 3,
      });
    } finally {
      mock.mockRestore();
    }
  });
  it.each([2, 3])(
    "preserves identities when a later activity query fails at index %i",
    async (successfulQueries) => {
      const f = await fixture();
      const original = prisma.$queryRaw.bind(prisma);
      const mock = vi.spyOn(prisma, "$queryRaw");
      for (let i = 0; i < successfulQueries; i++)
        mock.mockImplementationOnce(original);
      mock.mockRejectedValueOnce(new Error("activity query failed"));
      try {
        const result = await brandProductCreators(
          f.brand.id,
          f.product.id,
          query(),
          now,
        );
        expect(result).toMatchObject({
          metrics: null,
          metricsUnavailable: true,
        });
        expect(result?.groups).toHaveLength(3);
        expect(result?.groups.flatMap((g) => g.links)).toHaveLength(5);
      } finally {
        mock.mockRestore();
      }
    },
  );
});
