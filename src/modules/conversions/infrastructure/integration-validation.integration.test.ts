import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { seedBrand, seedLink } from "@/src/test/fixtures/accounts";
import { Money } from "@/src/modules/shared";
import { validateConversion } from "../application/validate-conversion";
import { intakeConversion } from "../application/intake-conversion";
import { prismaClickResolver } from "./prisma-click-resolver";
import { prismaConversionRepository } from "./prisma-conversion-repository";
import {
  isClickAttributed,
  recordIntegrationRequest,
  recentIntegrationRequests,
} from "./integration-requests";

describe("integration validation and request history", () => {
  it("validates repeatedly without changing money or consuming the click, then allows a live sale", async () => {
    const { brand, product, link } = await seedLink();
    const now = new Date();
    const click = await prisma.click.create({
      data: {
        id: `ck_${crypto.randomUUID()}`,
        brandId: brand.id,
        trackingLinkId: link.id,
        occurredAt: new Date(now.getTime() - 1000),
      },
    });
    const deps = {
      clock: { now: () => now },
      clicks: prismaClickResolver,
      conversions: prismaConversionRepository,
    };
    const validate = validateConversion({ ...deps, isClickAttributed });
    const payload = {
      orderId: "dry-run-order",
      clickId: click.id,
      occurredAt: now,
      items: [
        {
          sku: product.sku,
          qty: 1,
          unitPrice: Money.of("100"),
          lineDiscount: Money.ZERO,
          lineVat: Money.ZERO,
        },
      ],
    };
    const identity = { id: brand.id, vatRegistered: false };
    for (let i = 0; i < 2; i++)
      expect(await validate(identity, payload)).toMatchObject({
        valid: true,
        outcome: "eligible",
        commissionAmount: "10.00",
      });
    expect(await prisma.conversion.count()).toBe(0);
    expect(await prisma.attribution.count()).toBe(0);
    expect(
      (await prisma.click.findUniqueOrThrow({ where: { id: click.id } }))
        .convertedAt,
    ).toBeNull();
    const live = await intakeConversion(deps)(identity, payload);
    expect(live.kind).toBe("accepted");
    expect(
      await validate(identity, { ...payload, orderId: "second-order" }),
    ).toMatchObject({ valid: false, outcome: "click_already_attributed" });
    expect(await validate(identity, payload)).toMatchObject({
      outcome: "replay",
    });
  });

  it("keeps history isolated by brand and caps storage under concurrent requests", async () => {
    const a = await seedBrand();
    const b = await seedBrand();
    await prisma.integrationRequest.createMany({
      data: Array.from({ length: 100 }, () => ({
        id: crypto.randomUUID(),
        brandId: a.id,
        mode: "validation",
        status: 200,
        outcome: "no_click",
      })),
    });
    await Promise.all(
      Array.from({ length: 5 }, () =>
        recordIntegrationRequest({
          id: crypto.randomUUID(),
          brandId: a.id,
          mode: "live",
          status: 200,
          outcome: "accepted",
        }),
      ),
    );
    await recordIntegrationRequest({
      id: crypto.randomUUID(),
      brandId: b.id,
      mode: "validation",
      status: 422,
      outcome: "invalid_payload",
    });
    expect(
      await prisma.integrationRequest.count({ where: { brandId: a.id } }),
    ).toBe(100);
    const rows = await recentIntegrationRequests(a.id);
    expect(rows).toHaveLength(20);
    expect(rows.every((row) => row.brandId === a.id)).toBe(true);
    expect(await recentIntegrationRequests(b.id)).toHaveLength(1);
  });
});
