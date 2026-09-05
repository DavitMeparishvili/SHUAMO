import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";
import { expect, it } from "vitest";
import { requireTestDatabaseUrl } from "@/src/config/test-database-url";

it("migrates every legacy sale state without losing financial history", async () => {
  const client = new Client({
    connectionString: requireTestDatabaseUrl(process.env),
  });
  const schema = `sale_migration_${crypto.randomUUID().replaceAll("-", "")}`;
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(`
      CREATE TYPE "ConversionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'UNATTRIBUTED');
      CREATE TABLE conversion (
        id int PRIMARY KEY,
        status "ConversionStatus" NOT NULL DEFAULT 'PENDING',
        created_at timestamptz NOT NULL DEFAULT '2026-09-01T10:00:00Z',
        confirmed_at timestamptz,
        CONSTRAINT confirmed_at_matches_status CHECK ((status = 'CONFIRMED') = (confirmed_at IS NOT NULL))
      );
      CREATE TABLE attribution (
        id int PRIMARY KEY,
        conversion_id int REFERENCES conversion(id),
        commission_amount numeric(12,2),
        historical_click_id text,
        canonical_attribution_id int,
        status text
      );
      INSERT INTO conversion(id, status, confirmed_at) VALUES
        (1, 'PENDING', NULL), (2, 'CONFIRMED', '2026-09-01T11:00:00Z'),
        (3, 'CANCELLED', NULL), (4, 'UNATTRIBUTED', NULL);
      INSERT INTO attribution VALUES
        (1, 1, 10.00, NULL, NULL, 'CANONICAL'),
        (2, 2, 20.00, NULL, NULL, 'MANUAL_REVIEW'),
        (3, 3, 30.00, 'ck_old', 1, 'NONCANONICAL');
    `);
    const before = (await client.query("SELECT * FROM attribution ORDER BY id"))
      .rows;
    await client.query(
      await readFile(
        join(
          process.cwd(),
          "prisma/migrations/20260905120000_successful_sale_lifecycle/migration.sql",
        ),
        "utf8",
      ),
    );
    const rows = (
      await client.query(
        "SELECT id, status::text, confirmed_at FROM conversion ORDER BY id",
      )
    ).rows;
    expect(rows).toEqual([
      {
        id: 1,
        status: "CONFIRMED",
        confirmed_at: new Date("2026-09-01T10:00:00Z"),
      },
      {
        id: 2,
        status: "CONFIRMED",
        confirmed_at: new Date("2026-09-01T11:00:00Z"),
      },
      {
        id: 3,
        status: "CANCELLED",
        confirmed_at: new Date("2026-09-01T10:00:00Z"),
      },
      {
        id: 4,
        status: "CONFIRMED",
        confirmed_at: new Date("2026-09-01T10:00:00Z"),
      },
    ]);
    expect(
      (await client.query("SELECT * FROM attribution ORDER BY id")).rows,
    ).toEqual(before);
    await client.query("INSERT INTO conversion(id) VALUES (5)");
    expect(
      (
        await client.query(
          "SELECT status::text, confirmed_at FROM conversion WHERE id = 5",
        )
      ).rows[0],
    ).toMatchObject({ status: "CONFIRMED", confirmed_at: expect.any(Date) });
    await expect(
      client.query("UPDATE conversion SET status = 'PENDING' WHERE id = 5"),
    ).rejects.toThrow();
  } finally {
    await client.query("ROLLBACK");
    await client.query("SET search_path TO public");
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
});
