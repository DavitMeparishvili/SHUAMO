import { describe, expect, it, vi } from "vitest";
import type {
  AdminPerformanceQuery,
  AdminPerformanceReport,
} from "../ports/admin-performance";
import {
  readTeamMemberPerformance,
  readTeamPerformance,
} from "./read-team-performance";

const leadId = "00000000-0000-4000-8000-0000000000a1";
const memberId = "00000000-0000-4000-8000-0000000000b1";
const outsiderId = "00000000-0000-4000-8000-0000000000c1";
const lead = {
  kind: "creator" as const,
  userId: "u-lead",
  creatorId: leadId,
  displayName: "Nino",
  isAdmin: false,
  isTeamLead: true as const,
};
const creator = {
  kind: "creator" as const,
  userId: "u-plain",
  creatorId: "00000000-0000-4000-8000-0000000000f1",
  displayName: "Plain creator",
  isAdmin: false,
};
const query: AdminPerformanceQuery = {
  tab: "overview",
  from: "2026-10-01",
  to: "2026-10-26",
  creatorId: outsiderId,
  brandId: "00000000-0000-4000-8000-0000000000d1",
  productStatus: "ARCHIVED",
  q: "shoe",
  sort: "sales_value",
  direction: "desc",
  page: 1,
};

function fakeRepo() {
  return {
    report: vi.fn(
      async (q: AdminPerformanceQuery): Promise<AdminPerformanceReport> => ({
        query: q,
        totals: {
          clicks: 0,
          salesCount: 0,
          salesValue: "0.00",
          commission: "0.00",
        },
        trend: [],
        rows: { items: [], page: 1, pageSize: 25, total: 0 },
      }),
    ),
  };
}

describe("readTeamPerformance", () => {
  it("rejects a creator who is not a team lead", async () => {
    const repo = fakeRepo();
    await expect(readTeamPerformance(repo)(creator, query)).resolves.toEqual({
      ok: false,
      error: "wrong_capability",
    });
    await expect(
      readTeamPerformance(repo)({ kind: "anonymous" }, query),
    ).resolves.toEqual({ ok: false, error: "unauthenticated" });
    expect(repo.report).not.toHaveBeenCalled();
  });

  it("scopes the creators report to the lead's own team", async () => {
    const repo = fakeRepo();
    const result = await readTeamPerformance(repo)(lead, query);
    expect(repo.report).toHaveBeenCalledWith({
      ...query,
      tab: "creators",
      teamLeadId: leadId,
      creatorId: undefined,
      brandId: undefined,
      q: "",
      productStatus: "ALL",
    });
    expect(result.ok && result.value.query.teamLeadId).toBeUndefined();
  });
});

describe("readTeamMemberPerformance", () => {
  it("reads a non-member as not found without touching the report", async () => {
    const repo = fakeRepo();
    const isMember = vi.fn(async () => false);
    await expect(
      readTeamMemberPerformance(repo, isMember)(lead, outsiderId, query),
    ).resolves.toEqual({ ok: false, error: "not_found" });
    expect(isMember).toHaveBeenCalledWith(leadId, outsiderId);
    expect(repo.report).not.toHaveBeenCalled();
  });

  it("rejects a malformed member id", async () => {
    const repo = fakeRepo();
    const isMember = vi.fn(async () => true);
    await expect(
      readTeamMemberPerformance(repo, isMember)(lead, "not-a-uuid", query),
    ).resolves.toEqual({ ok: false, error: "invalid_input" });
    expect(isMember).not.toHaveBeenCalled();
  });

  it("rejects a creator who is not a team lead", async () => {
    const repo = fakeRepo();
    await expect(
      readTeamMemberPerformance(repo, async () => true)(
        creator,
        memberId,
        query,
      ),
    ).resolves.toEqual({ ok: false, error: "wrong_capability" });
  });

  it("fixes the report to the member and turns the creators tab into overview", async () => {
    const repo = fakeRepo();
    await readTeamMemberPerformance(repo, async () => true)(lead, memberId, {
      ...query,
      tab: "creators",
    });
    expect(repo.report).toHaveBeenCalledWith(
      expect.objectContaining({
        tab: "overview",
        creatorId: memberId,
        teamLeadId: undefined,
        brandId: undefined,
      }),
    );
  });

  it("keeps the brands and products tabs", async () => {
    const repo = fakeRepo();
    await readTeamMemberPerformance(repo, async () => true)(lead, memberId, {
      ...query,
      tab: "products",
    });
    expect(repo.report.mock.calls[0]![0].tab).toBe("products");
  });
});
