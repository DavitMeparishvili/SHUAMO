import { readFileSync } from "node:fs";
import { Client } from "pg";
import { requireTestDatabaseUrl } from "@/src/config/test-database-url";
import { prisma } from "@/src/infrastructure/db/client";
import {
  seedApprovedPartnership,
  seedCreator,
} from "@/src/test/fixtures/accounts";
import { describe, expect, it } from "vitest";

describe("single-link attribution migration", () => {
  it("ATTR-006 backfills pre-correction links from their product terms", async () => {
    const schema = `link_rate_migration_${crypto.randomUUID().replaceAll("-", "")}`;
    const migration = readFileSync(
      new URL(
        "../../../../prisma/migrations/20260901230000_single_link_attribution/migration.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const client = new Client({
      connectionString: requireTestDatabaseUrl(process.env),
    });
    await client.connect();

    try {
      await client.query("BEGIN");
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}"`);
      await client.query(`
        CREATE TYPE "RateType" AS ENUM ('PERCENT', 'FIXED');
        CREATE TYPE "LinkStatus" AS ENUM ('ACTIVE', 'DISABLED');
        CREATE TABLE product (
          id uuid PRIMARY KEY,
          commission_type "RateType" NOT NULL,
          commission_value numeric(9,4) NOT NULL
        );
        CREATE TABLE tracking_link (
          id uuid PRIMARY KEY,
          product_id uuid NOT NULL REFERENCES product(id),
          creator_id uuid NOT NULL,
          code text NOT NULL,
          status "LinkStatus" NOT NULL DEFAULT 'ACTIVE'
        );
        CREATE UNIQUE INDEX tracking_link_product_id_creator_id_key
          ON tracking_link (product_id, creator_id);
      `);

      const productId = crypto.randomUUID();
      const creatorId = crypto.randomUUID();
      const linkId = crypto.randomUUID();
      await client.query(
        `INSERT INTO product (id, commission_type, commission_value)
         VALUES ($1, 'PERCENT', 0.1250)`,
        [productId],
      );
      await client.query(
        `INSERT INTO tracking_link (id, product_id, creator_id, code)
         VALUES ($1, $2, $3, 'BACKFILL')`,
        [linkId, productId, creatorId],
      );

      await client.query(migration);

      const result = await client.query<{
        commissionType: string;
        commissionValue: string;
      }>(
        `SELECT commission_type::text AS "commissionType",
                commission_value::text AS "commissionValue"
         FROM tracking_link WHERE id = $1`,
        [linkId],
      );
      expect(result.rows).toEqual([
        { commissionType: "PERCENT", commissionValue: "0.1250" },
      ]);

      await client.query(
        "UPDATE product SET commission_value = 0.2500 WHERE id = $1",
        [productId],
      );
      const preserved = await client.query<{ commissionValue: string }>(
        `SELECT commission_value::text AS "commissionValue"
         FROM tracking_link WHERE id = $1`,
        [linkId],
      );
      expect(preserved.rows[0]?.commissionValue).toBe("0.1250");
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  });

  it("ATTR-006 and ATTR-007 store immutable link terms independently of the product", async () => {
    const { brand, creator } = await seedApprovedPartnership();
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: `RATE-${crypto.randomUUID()}`,
        title: "Rate fixture",
        priceGel: "100.00",
        backlinkUrl: "https://shop.example.ge/rate-fixture",
        commissionType: "FIXED",
        commissionValue: "8.0000",
      },
    });
    const link = await prisma.trackingLink.create({
      data: {
        productId: product.id,
        creatorId: creator.id,
        code: crypto.randomUUID().replaceAll("-", "").slice(0, 8),
        commissionType: "FIXED",
        commissionValue: "8.0000",
      },
    });

    await prisma.product.update({
      where: { id: product.id },
      data: { commissionValue: "12.0000" },
    });
    expect(
      (
        await prisma.trackingLink.findUniqueOrThrow({ where: { id: link.id } })
      ).commissionValue.toFixed(4),
    ).toBe("8.0000");
    await expect(
      prisma.trackingLink.update({
        where: { id: link.id },
        data: { commissionValue: "12.0000" },
      }),
    ).rejects.toThrow();
  });

  it("ATTR-001 permits 100 active creators on one product", async () => {
    const { brand } = await seedApprovedPartnership();
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: `MANY-${crypto.randomUUID()}`,
        title: "Shared product",
        priceGel: "100.00",
        backlinkUrl: "https://shop.example.ge/shared",
        commissionType: "PERCENT",
        commissionValue: "0.1000",
      },
    });
    const creators = await Promise.all(
      Array.from({ length: 100 }, () => seedCreator()),
    );
    const result = await prisma.trackingLink.createMany({
      data: creators.map((creator, index) => ({
        productId: product.id,
        creatorId: creator.id,
        code: `M${index.toString().padStart(7, "0")}`,
        commissionType: "PERCENT" as const,
        commissionValue: "0.1000",
      })),
    });
    expect(result.count).toBe(100);
    expect(
      await prisma.trackingLink.count({ where: { productId: product.id } }),
    ).toBe(100);
  });

  it("permits historical links but refuses two active links for one pair", async () => {
    const { brand, creator } = await seedApprovedPartnership();
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: `HISTORY-${crypto.randomUUID()}`,
        title: "History fixture",
        priceGel: "100.00",
        backlinkUrl: "https://shop.example.ge/history",
        commissionType: "FIXED",
        commissionValue: "8.0000",
      },
    });
    const data = {
      productId: product.id,
      creatorId: creator.id,
      commissionType: "FIXED" as const,
      commissionValue: "8.0000",
    };
    await prisma.trackingLink.create({
      data: { ...data, code: "OLD00001", status: "DISABLED" },
    });
    await prisma.trackingLink.create({
      data: { ...data, code: "NEW00001", status: "ACTIVE" },
    });
    await expect(
      prisma.trackingLink.create({
        data: { ...data, code: "NEW00002", status: "ACTIVE" },
      }),
    ).rejects.toThrow();
  });
});
