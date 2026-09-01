import { PrismaPg } from "@prisma/adapter-pg";
import { describe, expect, it } from "vitest";
import { GET as redirectRoute } from "@/app/r/[code]/route";
import { prisma } from "@/src/infrastructure/db/client";
import { PrismaClient } from "@/src/generated/prisma/client";
import { seedLink } from "@/src/test/fixtures/accounts";
import { recordClick } from "../application/record-click";
import type { TrackingRandomSource } from "../domain/click-id";
import { prismaClickRepository } from "./prisma-click-repository";
import { prismaLinkLookup } from "./prisma-link-lookup";

const SECRET = "0".repeat(40);
const VISITOR = "11111111-1111-4111-8111-111111111111";

function countingRandom(): TrackingRandomSource {
  let value = 0;
  return {
    bytes(count) {
      value = (value + 1) & 0xff;
      return new Uint8Array(count).fill(value);
    },
  };
}

function realRecord(now: () => Date, random = countingRandom()) {
  return recordClick({
    links: prismaLinkLookup,
    clicks: prismaClickRepository,
    clock: { now },
    random,
    secret: SECRET,
  });
}

async function click(input: {
  code: string;
  at: Date;
  visitorId?: string;
  ip?: string;
  userAgent?: string;
  random?: TrackingRandomSource;
}) {
  return realRecord(
    () => input.at,
    input.random,
  )({
    code: input.code,
    visitorId: input.visitorId,
    ip: input.ip ?? "31.146.0.1",
    userAgent: input.userAgent ?? "Mozilla/5.0",
  });
}

describe("redirect persistence", () => {
  it("makes the click visible to a second connection before returning 302", async () => {
    const { link } = await seedLink();
    const observer = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL_TEST!,
      }),
    });
    try {
      const response = await redirectRoute(
        new Request(`https://xu.ge/r/${link.code}`, {
          headers: { cookie: `xu_vid=${VISITOR}` },
        }),
        { params: Promise.resolve({ code: link.code }) },
      );
      expect(response.status).toBe(302);
      const clickId = new URL(
        response.headers.get("location")!,
      ).searchParams.get("xu");
      expect(clickId).toMatch(/^ck_/);

      // No polling: a response that wins this race broke the durability rule.
      const stored = await observer.click.findUnique({
        where: { id: clickId! },
      });
      expect(stored?.trackingLinkId).toBe(link.id);
    } finally {
      await observer.$disconnect();
    }
  });

  it("holds cookie dedup boundaries at 29m59s, 30m00s, and 30m01s", async () => {
    const [{ link }, boundary] = await Promise.all([seedLink(), seedLink()]);
    const start = new Date("2026-08-12T10:00:00Z");
    const random = countingRandom();
    await click({ code: link.code, at: start, visitorId: VISITOR, random });
    await click({
      code: link.code,
      at: new Date(start.getTime() + 29 * 60_000 + 59_000),
      visitorId: VISITOR,
      random,
    });
    await click({
      code: link.code,
      at: new Date(start.getTime() + 60 * 60_000),
      visitorId: VISITOR,
      random,
    });
    await click({
      code: boundary.link.code,
      at: start,
      visitorId: VISITOR,
      random,
    });
    await click({
      code: boundary.link.code,
      at: new Date(start.getTime() + 30 * 60_000),
      visitorId: VISITOR,
      random,
    });
    const rows = await prisma.click.findMany({
      where: { trackingLinkId: link.id },
      orderBy: { occurredAt: "asc" },
    });
    expect(rows.map((row) => row.creditable)).toEqual([true, false, true]);
    expect(
      (
        await prisma.click.findMany({
          where: { trackingLinkId: boundary.link.id },
          orderBy: { occurredAt: "asc" },
        })
      ).map((row) => row.creditable),
    ).toEqual([true, true]);
  });

  it("deduplicates per link rather than per visitor", async () => {
    const [first, second] = await Promise.all([seedLink(), seedLink()]);
    const random = countingRandom();
    await click({
      code: first.link.code,
      at: new Date("2026-08-12T10:00:00Z"),
      visitorId: VISITOR,
      random,
    });
    await click({
      code: second.link.code,
      at: new Date("2026-08-12T10:01:00Z"),
      visitorId: VISITOR,
      random,
    });
    expect(
      (await prisma.click.findMany({ orderBy: { occurredAt: "asc" } })).map(
        (row) => row.creditable,
      ),
    ).toEqual([true, true]);
  });

  it("holds fingerprint boundaries while returning xu for every click", async () => {
    const [inside, boundary, outside] = await Promise.all([
      seedLink(),
      seedLink(),
      seedLink(),
    ]);
    const random = countingRandom();
    const first = await click({
      code: inside.link.code,
      at: new Date("2026-08-12T10:00:00Z"),
      random,
    });
    const second = await click({
      code: inside.link.code,
      at: new Date("2026-08-12T10:29:59Z"),
      random,
    });
    const third = await click({
      code: boundary.link.code,
      at: new Date("2026-08-12T10:00:00Z"),
      random,
    });
    const fourth = await click({
      code: boundary.link.code,
      at: new Date("2026-08-12T10:30:00Z"),
      random,
    });
    const fifth = await click({
      code: outside.link.code,
      at: new Date("2026-08-12T10:00:00Z"),
      random,
    });
    const sixth = await click({
      code: outside.link.code,
      at: new Date("2026-08-12T10:30:01Z"),
      random,
    });
    expect(first.kind === "redirect" && first.location).toContain("?xu=ck_");
    expect(second.kind === "redirect" && second.location).toContain("?xu=ck_");
    expect(third.kind === "redirect" && third.location).toContain("?xu=ck_");
    expect(fourth.kind === "redirect" && fourth.location).toContain("?xu=ck_");
    expect(fifth.kind === "redirect" && fifth.location).toContain("?xu=ck_");
    expect(sixth.kind === "redirect" && sixth.location).toContain("?xu=ck_");
    const rows = await prisma.click.findMany({
      orderBy: [{ trackingLinkId: "asc" }, { occurredAt: "asc" }],
    });
    expect(
      rows
        .filter((row) => row.trackingLinkId === inside.link.id)
        .map((row) => row.creditable),
    ).toEqual([true, false]);
    expect(
      rows
        .filter((row) => row.trackingLinkId === boundary.link.id)
        .map((row) => row.creditable),
    ).toEqual([true, true]);
    expect(
      rows
        .filter((row) => row.trackingLinkId === outside.link.id)
        .map((row) => row.creditable),
    ).toEqual([true, true]);
    expect(rows.every((row) => row.visitorId === null)).toBe(true);
  });

  it("ends fingerprint matching when the daily salt rolls at UTC midnight", async () => {
    const { link } = await seedLink();
    const random = countingRandom();
    await click({
      code: link.code,
      at: new Date("2026-08-12T23:59:30Z"),
      random,
    });
    await click({
      code: link.code,
      at: new Date("2026-08-13T00:00:30Z"),
      random,
    });
    expect(
      (await prisma.click.findMany({ orderBy: { occurredAt: "asc" } })).map(
        (row) => row.creditable,
      ),
    ).toEqual([true, true]);
  });

  it("lets a presented cookie decide even when its fingerprint already exists", async () => {
    const { link } = await seedLink();
    const random = countingRandom();
    await click({
      code: link.code,
      at: new Date("2026-08-12T10:00:00Z"),
      random,
    });
    await click({
      code: link.code,
      at: new Date("2026-08-12T10:01:00Z"),
      visitorId: VISITOR,
      random,
    });
    expect(
      (await prisma.click.findMany({ orderBy: { occurredAt: "asc" } })).map(
        (row) => row.creditable,
      ),
    ).toEqual([true, true]);
  });

  it.each(["visitor", "fingerprint"] as const)(
    "serializes twenty simultaneous identical %s clicks",
    async (kind) => {
      const { link, brand } = await seedLink();
      const occurredAt = new Date("2026-08-12T10:00:00Z");
      const fpHash = "a".repeat(64);
      await Promise.all(
        Array.from({ length: 20 }, async (_, index) => {
          await prismaClickRepository.insertDeduplicated!(
            {
              id: `ck_${index.toString(16).padStart(12, "0")}`,
              trackingLinkId: link.id,
              brandId: brand.id,
              visitorId: kind === "visitor" ? VISITOR : undefined,
              fpHash,
              occurredAt,
            },
            kind === "visitor"
              ? {
                  kind,
                  value: VISITOR,
                  since: new Date(occurredAt.getTime() - 30 * 60_000),
                }
              : {
                  kind,
                  value: fpHash,
                  since: new Date(occurredAt.getTime() - 30 * 60_000),
                },
          );
        }),
      );

      const rows = await prisma.click.findMany({
        where: { trackingLinkId: link.id },
      });
      expect(rows).toHaveLength(20);
      expect(rows.filter((row) => row.creditable)).toHaveLength(1);
    },
  );
});
