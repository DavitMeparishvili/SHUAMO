import { describe, expect, it } from "vitest";
import { prisma } from "./client";
import { checkDatabaseReadiness } from "./readiness";

describe("database readiness", () => {
  it("reports ok against a migrated database", async () => {
    await expect(checkDatabaseReadiness()).resolves.toEqual({ ok: true });
  });

  it("round-trips a row with a timestamptz default", async () => {
    const created = await prisma.healthProbe.create({ data: {} });
    const read = await prisma.healthProbe.findUniqueOrThrow({
      where: { id: created.id },
    });

    expect(read.observedAt).toBeInstanceOf(Date);
    expect(read.observedAt.getTime()).toBe(created.observedAt.getTime());
  });
});
