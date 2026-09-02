import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";
import { expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260902170000_single_order_per_click",
  "migration.sql",
);

it("audits and resolves duplicate clicks without losing orders or financial history", async () => {
  const connectionString = process.env.DATABASE_URL_TEST;
  if (connectionString === undefined) {
    throw new Error("DATABASE_URL_TEST is required");
  }
  const schema = `migration_${crypto.randomUUID().replaceAll("-", "")}`;
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(`
      CREATE TABLE tracking_link (
        id uuid PRIMARY KEY,
        creator_id uuid NOT NULL,
        product_id uuid NOT NULL
      );
      CREATE TABLE product (id uuid PRIMARY KEY, sku text NOT NULL);
      CREATE TABLE click (
        id text PRIMARY KEY,
        tracking_link_id uuid NOT NULL,
        brand_id uuid NOT NULL
      );
      CREATE TABLE conversion (
        id uuid PRIMARY KEY,
        brand_id uuid NOT NULL,
        order_id text NOT NULL
      );
      CREATE TABLE conversion_item (
        id uuid PRIMARY KEY,
        conversion_id uuid NOT NULL,
        sku text NOT NULL
      );
      CREATE TABLE attribution (
        id uuid PRIMARY KEY,
        conversion_item_id uuid NOT NULL UNIQUE,
        click_id text NOT NULL,
        creator_id uuid NOT NULL,
        product_id uuid NOT NULL,
        commission_amount numeric(12,2) NOT NULL,
        created_at timestamptz NOT NULL
      );
      CREATE INDEX attribution_click_idx ON attribution (click_id);
      CREATE FUNCTION prevent_attribution_amount_update()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.commission_amount IS DISTINCT FROM OLD.commission_amount THEN
          RAISE EXCEPTION 'attribution commission amount is immutable';
        END IF;
        RETURN NEW;
      END;
      $$;
      CREATE TRIGGER attribution_amount_immutable
      BEFORE UPDATE ON attribution
      FOR EACH ROW EXECUTE FUNCTION prevent_attribution_amount_update();

      INSERT INTO product VALUES
        ('10000000-0000-4000-8000-000000000001', 'SKU-1');
      INSERT INTO tracking_link VALUES
        (
          '20000000-0000-4000-8000-000000000001',
          '30000000-0000-4000-8000-000000000001',
          '10000000-0000-4000-8000-000000000001'
        );
      INSERT INTO click VALUES
        (
          'ck_duplicate',
          '20000000-0000-4000-8000-000000000001',
          '40000000-0000-4000-8000-000000000001'
        ),
        (
          'ck_single',
          '20000000-0000-4000-8000-000000000001',
          '40000000-0000-4000-8000-000000000001'
        );
      INSERT INTO conversion VALUES
        (
          '50000000-0000-4000-8000-000000000001',
          '40000000-0000-4000-8000-000000000001',
          'EARLIEST-ORDER'
        ),
        (
          '50000000-0000-4000-8000-000000000002',
          '40000000-0000-4000-8000-000000000001',
          'LATER-ORDER'
        ),
        (
          '50000000-0000-4000-8000-000000000003',
          '40000000-0000-4000-8000-000000000001',
          'UNAFFECTED-ORDER'
        );
      INSERT INTO conversion_item VALUES
        ('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'SKU-1'),
        ('60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', 'SKU-1'),
        ('60000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000002', 'SKU-1'),
        ('60000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000003', 'SKU-1'),
        ('60000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000002', 'SKU-1');
      INSERT INTO attribution VALUES
        (
          '70000000-0000-4000-8000-000000000001',
          '60000000-0000-4000-8000-000000000001',
          'ck_duplicate',
          '30000000-0000-4000-8000-000000000001',
          '10000000-0000-4000-8000-000000000001',
          2.00,
          '2026-08-01T00:00:00Z'
        ),
        (
          '70000000-0000-4000-8000-000000000002',
          '60000000-0000-4000-8000-000000000002',
          'ck_duplicate',
          '30000000-0000-4000-8000-000000000001',
          '10000000-0000-4000-8000-000000000001',
          3.00,
          '2026-08-01T00:00:01Z'
        ),
        (
          '70000000-0000-4000-8000-000000000003',
          '60000000-0000-4000-8000-000000000003',
          'ck_duplicate',
          '30000000-0000-4000-8000-000000000001',
          '10000000-0000-4000-8000-000000000001',
          4.00,
          '2026-08-02T00:00:00Z'
        ),
        (
          '70000000-0000-4000-8000-000000000004',
          '60000000-0000-4000-8000-000000000004',
          'ck_single',
          '30000000-0000-4000-8000-000000000001',
          '10000000-0000-4000-8000-000000000001',
          6.00,
          '2026-08-03T00:00:00Z'
        );
    `);

    await client.query(await readFile(migrationPath, "utf8"));

    const audit = await client.query<{
      rows: number;
      original_commission: string;
      orders: number;
    }>(`
      SELECT
        COUNT(*)::int AS rows,
        SUM(commission_amount)::text AS original_commission,
        COUNT(DISTINCT conversion_id)::int AS orders
      FROM attribution_duplicate_click_audit
      WHERE click_id = 'ck_duplicate'
    `);
    expect(audit.rows[0]).toEqual({
      rows: 3,
      original_commission: "9.00",
      orders: 2,
    });

    const canonical = await client.query<{
      id: string;
      commission_amount: string;
      status: string;
      order_id: string;
    }>(`
      SELECT a.id::text, a.commission_amount::text, a.status::text, cv.order_id
      FROM attribution a
      JOIN conversion_item ci ON ci.id = a.conversion_item_id
      JOIN conversion cv ON cv.id = ci.conversion_id
      WHERE a.click_id = 'ck_duplicate'
    `);
    expect(canonical.rows).toEqual([
      {
        id: "70000000-0000-4000-8000-000000000001",
        commission_amount: "5.00",
        status: "CANONICAL",
        order_id: "EARLIEST-ORDER",
      },
    ]);

    const retained = await client.query<{
      rows: number;
      commission: string;
      orders: number;
    }>(`
      SELECT
        COUNT(*)::int AS rows,
        SUM(a.commission_amount)::text AS commission,
        COUNT(DISTINCT ci.conversion_id)::int AS orders
      FROM attribution a
      JOIN conversion_item ci ON ci.id = a.conversion_item_id
      WHERE a.historical_click_id = 'ck_duplicate'
        AND a.status = 'NONCANONICAL'
    `);
    expect(retained.rows[0]).toEqual({
      rows: 2,
      commission: "7.00",
      orders: 2,
    });
    expect(
      (
        await client.query<{ rows: number }>(
          "SELECT COUNT(*)::int AS rows FROM attribution",
        )
      ).rows[0]?.rows,
    ).toBe(4);

    await expect(
      client.query(`
        INSERT INTO attribution (
          id, conversion_item_id, click_id, creator_id, product_id,
          commission_amount, created_at
        ) VALUES (
          '70000000-0000-4000-8000-000000000005',
          '60000000-0000-4000-8000-000000000005',
          'ck_duplicate',
          '30000000-0000-4000-8000-000000000001',
          '10000000-0000-4000-8000-000000000001',
          1.00,
          '2026-08-04T00:00:00Z'
        )
      `),
    ).rejects.toThrow(/attribution_click_id_key/);
  } finally {
    await client.query("ROLLBACK");
    await client.query("SET search_path TO public");
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
});
