import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { seedLink } from "@/src/test/fixtures/accounts";

describe("click table", () => {
  it("stores a ck_ text id, defaults, and denormalised brand", async () => {
    const { link, brand } = await seedLink();
    const click = await prisma.click.create({
      data: {
        id: "ck_a91f00000001",
        trackingLinkId: link.id,
        brandId: brand.id,
        fpHash: "a".repeat(64),
      },
    });
    expect(click).toMatchObject({
      id: "ck_a91f00000001",
      brandId: brand.id,
      creditable: true,
      convertedAt: null,
      visitorId: null,
    });
  });

  it("has the four contract indexes with both partial predicates", async () => {
    const indexes = await prisma.$queryRaw<
      { indexname: string; indexdef: string }[]
    >`
      SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'click'
    `;
    const definitions = new Map(
      indexes.map((row) => [row.indexname, row.indexdef]),
    );
    expect([...definitions.keys()]).toEqual(
      expect.arrayContaining([
        "click_candidates_idx",
        "click_link_idx",
        "click_fp_dedup_idx",
        "click_converted_idx",
      ]),
    );
    expect(definitions.get("click_candidates_idx")).toMatch(
      /WHERE creditable/i,
    );
    expect(definitions.get("click_fp_dedup_idx")).toMatch(
      /WHERE \(fp_hash IS NOT NULL\)/i,
    );
    expect(definitions.get("click_converted_idx")).toMatch(
      /WHERE \(converted_at IS NOT NULL\)/i,
    );
  });

  it("contains no raw buyer network or agent columns", async () => {
    const columns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'click'
    `;
    expect(columns.map((row) => row.column_name)).not.toEqual(
      expect.arrayContaining(["ip", "user_agent"]),
    );
  });

  it("restricts orphaned tracking-link and brand references", async () => {
    const { brand } = await seedLink();
    await expect(
      prisma.click.create({
        data: {
          id: "ck_orphan000001",
          trackingLinkId: crypto.randomUUID(),
          brandId: brand.id,
        },
      }),
    ).rejects.toThrow();
  });
});
