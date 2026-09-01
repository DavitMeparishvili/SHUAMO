import { Client } from "pg";
import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import {
  createProductForBrand,
  decidePartnershipForBrand,
  inviteCreatorForBrand,
} from "./phase-3-services";
import { seedBrand, seedCreator } from "@/src/test/fixtures/accounts";

const COMMIT_HOLD_LOCK = "7340032003";

async function installDeferredProductHold() {
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION phase3_hold_race_product_at_commit()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF NEW.sku LIKE 'RACE-%' THEN
        PERFORM pg_advisory_xact_lock(${COMMIT_HOLD_LOCK}::bigint);
      END IF;
      RETURN NEW;
    END;
    $$
  `);
  await prisma.$executeRawUnsafe(`
    CREATE CONSTRAINT TRIGGER phase3_hold_race_product_at_commit
    AFTER INSERT ON product
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION phase3_hold_race_product_at_commit()
  `);
}

async function removeDeferredProductHold() {
  await prisma.$executeRawUnsafe(
    `DROP TRIGGER IF EXISTS phase3_hold_race_product_at_commit ON product`,
  );
  await prisma.$executeRawUnsafe(
    `DROP FUNCTION IF EXISTS phase3_hold_race_product_at_commit()`,
  );
}

async function waitForAdvisoryWaiters(minimum: number): Promise<boolean> {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const [row] = await prisma.$queryRaw<{ waiting: number }[]>`
      SELECT count(*)::int AS waiting
      FROM pg_locks
      WHERE locktype = 'advisory' AND NOT granted
    `;
    if ((row?.waiting ?? 0) >= minimum) return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return false;
}

describe("Phase 3 edge-producing mutation concurrency", () => {
  it.each(["APPROVAL", "INVITATION"] as const)(
    "serializes product creation against %s and mints exactly one link",
    async (mode) => {
      const [brand, creator] = await Promise.all([seedBrand(), seedCreator()]);
      const partnership =
        mode === "APPROVAL"
          ? await prisma.partnership.create({
              data: {
                brandId: brand.id,
                creatorId: creator.id,
                status: "PENDING",
              },
            })
          : undefined;

      const controller = new Client({
        connectionString: process.env.DATABASE_URL_TEST,
      });
      await controller.connect();
      await installDeferredProductHold();
      await controller.query(`SELECT pg_advisory_lock($1::bigint)`, [
        COMMIT_HOLD_LOCK,
      ]);
      let controllerHoldsLock = true;
      let productPromise: ReturnType<typeof createProductForBrand> | undefined;
      let edgePromise:
        | ReturnType<typeof decidePartnershipForBrand>
        | ReturnType<typeof inviteCreatorForBrand>
        | undefined;

      try {
        productPromise = createProductForBrand(brand.id, {
          sku: `RACE-${mode}`,
          title: "Concurrent product",
          priceGel: "100.00",
          backlinkUrl: "https://example.ge/concurrent",
          commissionType: "PERCENT",
          commissionValue: "0.1",
        });

        // The deferred trigger fires only after createProduct has read the
        // partnership snapshot and is trying to commit its uncommitted row.
        const productReachedCommit = await waitForAdvisoryWaiters(1);

        edgePromise =
          mode === "APPROVAL"
            ? decidePartnershipForBrand(brand.id, partnership!.id, "APPROVE")
            : inviteCreatorForBrand(brand.id, creator.id);

        // With the per-brand lock, the second operation must now be waiting
        // behind product creation rather than reading a mutually stale view.
        const edgeWaitsForProduct = await waitForAdvisoryWaiters(2);

        await controller.query(`SELECT pg_advisory_unlock($1::bigint)`, [
          COMMIT_HOLD_LOCK,
        ]);
        controllerHoldsLock = false;

        const [productResult, edgeResult] = await Promise.all([
          productPromise,
          edgePromise,
        ]);

        expect(productReachedCommit).toBe(true);
        expect(edgeWaitsForProduct).toBe(true);
        expect(productResult).toEqual({
          ok: true,
          value: expect.objectContaining({ mintedLinks: 0 }),
        });
        expect(edgeResult).toEqual({
          ok: true,
          value: expect.objectContaining({ mintedLinks: 1 }),
        });
        expect(
          await prisma.trackingLink.count({
            where: { product: { brandId: brand.id }, creatorId: creator.id },
          }),
        ).toBe(1);

        if (mode === "APPROVAL") {
          await expect(
            decidePartnershipForBrand(brand.id, partnership!.id, "APPROVE"),
          ).resolves.toEqual({ ok: true, value: { mintedLinks: 0 } });
        } else {
          await expect(
            inviteCreatorForBrand(brand.id, creator.id),
          ).resolves.toEqual({ ok: false, error: "already_exists" });
        }
        expect(
          await prisma.trackingLink.count({
            where: { product: { brandId: brand.id }, creatorId: creator.id },
          }),
        ).toBe(1);
      } finally {
        if (controllerHoldsLock) {
          await controller.query(`SELECT pg_advisory_unlock($1::bigint)`, [
            COMMIT_HOLD_LOCK,
          ]);
        }
        await Promise.allSettled(
          [productPromise, edgePromise].filter(
            (promise): promise is NonNullable<typeof promise> =>
              promise !== undefined,
          ),
        );
        await removeDeferredProductHold();
        await controller.end();
      }
    },
  );
});
