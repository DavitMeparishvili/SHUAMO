import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { calculateAttributions } from "@/src/modules/attribution";
import { Money } from "@/src/modules/shared";
import { intakeConversion } from "../application/intake-conversion";
import type { ConversionPayload } from "../domain/payload";
import { prismaClickResolver } from "./prisma-click-resolver";
import { prismaConversionRepository } from "./prisma-conversion-repository";
import { seedBrand, seedLink } from "@/src/test/fixtures/accounts";

const NOW = new Date("2026-09-02T08:00:00Z");

function payload(
  clickId: string | undefined,
  sku: string,
  overrides: Partial<ConversionPayload> = {},
): ConversionPayload {
  return {
    orderId: crypto.randomUUID(),
    occurredAt: NOW,
    clickId,
    items: [
      {
        sku,
        qty: 1,
        unitPrice: Money.of("100.00"),
        lineDiscount: Money.ZERO,
        lineVat: Money.ZERO,
      },
    ],
    ...overrides,
  };
}

const intake = intakeConversion({
  clock: { now: () => NOW },
  clicks: prismaClickResolver,
  conversions: prismaConversionRepository,
});

async function fixture(options: { creditable?: boolean } = {}) {
  const seeded = await seedLink();
  const click = await prisma.click.create({
    data: {
      id: `ck_${crypto.randomUUID()}`,
      trackingLinkId: seeded.link.id,
      brandId: seeded.brand.id,
      occurredAt: new Date(NOW.getTime() - 60_000),
      creditable: options.creditable ?? true,
    },
  });
  return { ...seeded, click };
}

describe("single-link conversion intake", () => {
  beforeEach(() => {
    expect(calculateAttributions).toBeTypeOf("function");
  });

  it("ATTR-003 attributes only the creator resolved from the submitted click", async () => {
    const first = await fixture();
    const second = await seedLink();
    await prisma.click.create({
      data: {
        id: `ck_${crypto.randomUUID()}`,
        trackingLinkId: second.link.id,
        brandId: second.brand.id,
        occurredAt: new Date(NOW.getTime() - 30_000),
      },
    });
    const result = await intake(
      { id: first.brand.id, vatRegistered: false },
      payload(first.click.id, first.product.sku),
    );
    expect(result.kind).toBe("accepted");
    if (!("conversion" in result)) return;
    expect(result.conversion.items[0]?.attribution).toMatchObject({
      clickId: first.click.id,
      creatorId: first.creator.id,
      productId: first.product.id,
      commissionAmount: "10.00",
    });
    expect(await prisma.attribution.count()).toBe(1);
  });

  it("ATTR-008 replays one shop order without another conversion or commission", async () => {
    const { brand, product, click } = await fixture();
    const input = payload(click.id, product.sku);
    const [first, replay] = await Promise.all([
      intake({ id: brand.id, vatRegistered: false }, input),
      intake({ id: brand.id, vatRegistered: false }, input),
    ]);
    expect([first.kind, replay.kind].sort()).toEqual(["accepted", "replay"]);
    expect(await prisma.conversion.count()).toBe(1);
    expect(await prisma.attribution.count()).toBe(1);
    if (!("conversion" in first) || !("conversion" in replay)) return;
    expect(first.conversion).toEqual(replay.conversion);
  });

  it("rejects a changed click ID instead of replaying an unattributed order", async () => {
    const { brand, product, click } = await fixture();
    const firstPayload = payload(undefined, product.sku);
    const first = await intake(
      { id: brand.id, vatRegistered: false },
      firstPayload,
    );
    const changed = await intake(
      { id: brand.id, vatRegistered: false },
      { ...firstPayload, clickId: click.id },
    );
    expect(first.kind).toBe("unattributed");
    expect(changed).toEqual({ kind: "conflict" });
    expect(await prisma.conversion.count()).toBe(1);
    expect(await prisma.attribution.count()).toBe(0);
  });

  it("replays the exact submitted JSON after the brand VAT status changes", async () => {
    const { brand, product, click } = await fixture();
    await prisma.brand.update({
      where: { id: brand.id },
      data: { vatRegistered: true },
    });
    const input = payload(click.id, product.sku, {
      items: [
        {
          sku: product.sku,
          qty: 1,
          unitPrice: Money.of("118.00"),
          lineDiscount: Money.ZERO,
          lineVat: undefined,
        },
      ],
    });
    expect(
      (await intake({ id: brand.id, vatRegistered: true }, input)).kind,
    ).toBe("accepted");
    await prisma.brand.update({
      where: { id: brand.id },
      data: { vatRegistered: false },
    });
    expect(
      (await intake({ id: brand.id, vatRegistered: false }, input)).kind,
    ).toBe("replay");
    expect(await prisma.conversion.count()).toBe(1);
    expect(await prisma.attribution.count()).toBe(1);
  });

  it("replays concurrent identical omitted-VAT requests across VAT states", async () => {
    const { brand, product, click } = await fixture();
    const input = payload(click.id, product.sku, {
      items: [
        {
          sku: product.sku,
          qty: 1,
          unitPrice: Money.of("118.00"),
          lineDiscount: Money.ZERO,
          lineVat: undefined,
        },
      ],
    });
    const results = await Promise.all([
      intake({ id: brand.id, vatRegistered: true }, input),
      intake({ id: brand.id, vatRegistered: false }, input),
    ]);
    expect(results.map((result) => result.kind).sort()).toEqual([
      "accepted",
      "replay",
    ]);
    expect(await prisma.conversion.count()).toBe(1);
    expect(await prisma.attribution.count()).toBe(1);
  });

  it("serializes concurrent requests with different click IDs as one write and one conflict", async () => {
    const { brand, product, link, click } = await fixture();
    const otherClick = await prisma.click.create({
      data: {
        id: `ck_${crypto.randomUUID()}`,
        trackingLinkId: link.id,
        brandId: brand.id,
        occurredAt: new Date(NOW.getTime() - 30_000),
      },
    });
    const orderId = crypto.randomUUID();
    const results = await Promise.all([
      intake(
        { id: brand.id, vatRegistered: false },
        payload(click.id, product.sku, { orderId }),
      ),
      intake(
        { id: brand.id, vatRegistered: false },
        payload(otherClick.id, product.sku, { orderId }),
      ),
    ]);
    expect(results.map((result) => result.kind).sort()).toEqual([
      "accepted",
      "conflict",
    ]);
    expect(await prisma.conversion.count()).toBe(1);
    expect(await prisma.attribution.count()).toBe(1);
    expect((await prisma.attribution.findFirstOrThrow()).clickId).toSatisfy(
      (id: string) => id === click.id || id === otherClick.id,
    );
  });

  it("ATTR-009 attributes a recorded click after its link is disabled", async () => {
    const { brand, product, link, click } = await fixture();
    await prisma.trackingLink.update({
      where: { id: link.id },
      data: { status: "DISABLED" },
    });
    const result = await intake(
      { id: brand.id, vatRegistered: false },
      payload(click.id, product.sku),
    );
    expect(result.kind).toBe("accepted");
    expect(await prisma.attribution.count()).toBe(1);
  });

  it("ATTR-010 does not reject the cited click when creditable is false", async () => {
    const { brand, product, click } = await fixture({ creditable: false });
    const result = await intake(
      { id: brand.id, vatRegistered: false },
      payload(click.id, product.sku),
    );
    expect(result.kind).toBe("accepted");
    expect(await prisma.attribution.count()).toBe(1);
  });

  it.each(["absent", "unknown", "cross-brand", "future", "expired"] as const)(
    "%s click produces an UNATTRIBUTED conversion",
    async (kind) => {
      const { brand, product, click } = await fixture();
      let cited: string | undefined = click.id;
      if (kind === "absent") cited = undefined;
      if (kind === "unknown") cited = "ck_unknown";
      if (kind === "cross-brand") {
        const other = await seedBrand();
        await prisma.click.update({
          where: { id: click.id },
          data: { brandId: other.id },
        });
      }
      if (kind === "future") {
        await prisma.click.update({
          where: { id: click.id },
          data: { occurredAt: new Date(NOW.getTime() + 1) },
        });
      }
      if (kind === "expired") {
        await prisma.click.update({
          where: { id: click.id },
          data: { occurredAt: new Date(NOW.getTime() - 31 * 86_400_000) },
        });
      }
      const result = await intake(
        { id: brand.id, vatRegistered: false },
        payload(cited, product.sku),
      );
      expect(result.kind).toBe("unattributed");
      if (!("conversion" in result)) return;
      expect(result.conversion.status).toBe("UNATTRIBUTED");
      expect(await prisma.attribution.count()).toBe(0);
    },
  );

  it("a mixed cart pays only lines whose posted SKU matches the linked product", async () => {
    const { brand, product, click } = await fixture();
    const input = payload(click.id, product.sku, {
      items: [
        {
          sku: "OTHER",
          qty: 1,
          unitPrice: Money.of("500.00"),
          lineDiscount: Money.ZERO,
          lineVat: Money.ZERO,
        },
        {
          sku: product.sku,
          qty: 2,
          unitPrice: Money.of("100.00"),
          lineDiscount: Money.ZERO,
          lineVat: Money.ZERO,
        },
      ],
    });
    const result = await intake({ id: brand.id, vatRegistered: false }, input);
    if (!("conversion" in result)) throw new Error("expected conversion");
    const bySku = new Map(
      result.conversion.items.map((item) => [item.sku, item]),
    );
    expect(bySku.get("OTHER")?.attribution).toBeUndefined();
    expect(bySku.get(product.sku)?.attribution?.commissionAmount).toBe("20.00");
  });

  it("uses the link snapshot after the product offer rate changes", async () => {
    const { brand, product, click } = await fixture();
    await prisma.product.update({
      where: { id: product.id },
      data: { commissionValue: "99.0000" },
    });
    const result = await intake(
      { id: brand.id, vatRegistered: false },
      payload(click.id, product.sku),
    );
    if (!("conversion" in result)) throw new Error("expected conversion");
    expect(result.conversion.items[0]?.attribution?.commissionAmount).toBe(
      "10.00",
    );
  });

  it("keeps the first converted_at and leaves non-earning clicks null", async () => {
    const { brand, product, click } = await fixture();
    await intake(
      { id: brand.id, vatRegistered: false },
      payload(click.id, product.sku),
    );
    const first = await prisma.click.findUniqueOrThrow({
      where: { id: click.id },
      select: { convertedAt: true },
    });
    await intake(
      { id: brand.id, vatRegistered: false },
      payload(click.id, product.sku, {
        orderId: crypto.randomUUID(),
        occurredAt: new Date(NOW.getTime() + 60_000),
      }),
    );
    expect(
      (await prisma.click.findUniqueOrThrow({ where: { id: click.id } }))
        .convertedAt,
    ).toEqual(first.convertedAt);

    const nonEarning = await fixture();
    await intake(
      { id: nonEarning.brand.id, vatRegistered: false },
      payload(nonEarning.click.id, "OTHER"),
    );
    expect(
      (
        await prisma.click.findUniqueOrThrow({
          where: { id: nonEarning.click.id },
        })
      ).convertedAt,
    ).toBeNull();
  });

  it("confirms and cancels atomically with audit while preserving amounts", async () => {
    const { brand, product, click } = await fixture();
    const accepted = await intake(
      { id: brand.id, vatRegistered: false },
      payload(click.id, product.sku),
    );
    if (!("conversion" in accepted)) throw new Error("expected conversion");
    const id = accepted.conversion.id;
    const before = (
      await prisma.attribution.findFirstOrThrow()
    ).commissionAmount.toFixed(2);
    expect(
      await prismaConversionRepository.decide({
        brandId: brand.id,
        actorId: brand.userId,
        conversionId: id,
        action: "CONFIRM",
        now: NOW,
      }),
    ).toEqual({ ok: true, value: { status: "CONFIRMED" } });
    expect(
      await prismaConversionRepository.decide({
        brandId: brand.id,
        actorId: brand.userId,
        conversionId: id,
        action: "CANCEL",
        now: new Date(NOW.getTime() + 1),
      }),
    ).toEqual({ ok: true, value: { status: "CANCELLED" } });
    expect(
      (await prisma.attribution.findFirstOrThrow()).commissionAmount.toFixed(2),
    ).toBe(before);
    expect(await prisma.auditEvent.count()).toBe(2);
    expect(
      (await prisma.conversion.findUniqueOrThrow({ where: { id } }))
        .confirmedAt,
    ).toBeNull();
    expect(
      (await prisma.click.findUniqueOrThrow({ where: { id: click.id } }))
        .convertedAt,
    ).toEqual(NOW);
  });
});
