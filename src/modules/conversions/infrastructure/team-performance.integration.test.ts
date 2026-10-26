import { expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { financeFixture } from "@/src/test/fixtures/finance";
import { seedCreator } from "@/src/test/fixtures/accounts";
import { prismaAdminPerformance as reports } from "./prisma-admin-performance";
import type { AdminPerformanceQuery } from "../ports/admin-performance";

const query: AdminPerformanceQuery = {
  tab: "creators",
  from: "2026-09-01",
  to: "2026-09-30",
  productStatus: "ALL",
  q: "",
  sort: "name",
  direction: "asc",
  page: 1,
};

it("limits the creators report to one lead's team without changing the admin report", async () => {
  const lead = await seedCreator({ isTeamLead: true });
  const [m1, m2, outsider] = await Promise.all([
    financeFixture(),
    financeFixture(),
    financeFixture(),
  ]);
  await prisma.creator.updateMany({
    where: { id: { in: [m1.creator.id, m2.creator.id] } },
    data: { teamLeadId: lead.id },
  });

  const team = await reports.report({ ...query, teamLeadId: lead.id });
  expect(team.rows.items.map((row) => row.id).sort()).toEqual(
    [m1.creator.id, m2.creator.id].sort(),
  );
  expect(team.rows.total).toBe(2);
  expect(team.totals.salesCount).toBe(2);
  expect(team.totals.clicks).toBe(2);
  expect(team.totals.commission).toBe("600.00");

  const admin = await reports.report(query);
  expect(admin.rows.items.map((row) => row.id)).toEqual(
    expect.arrayContaining([m1.creator.id, m2.creator.id, outsider.creator.id]),
  );
  expect(admin.totals.salesCount).toBe(3);
});
