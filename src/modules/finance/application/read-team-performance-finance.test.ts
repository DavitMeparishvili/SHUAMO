import { describe, expect, it, vi } from "vitest";
import type { AdminPerformanceFinance } from "../ports/admin-performance-finance";
import { readTeamPerformanceFinance } from "./read-team-performance-finance";

const leadId = "00000000-0000-4000-8000-0000000000a1";
const m1 = "00000000-0000-4000-8000-0000000000b1";
const m2 = "00000000-0000-4000-8000-0000000000b2";
const outsider = "00000000-0000-4000-8000-0000000000c1";
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
const period = { from: "2026-10-01", to: "2026-10-26" };

function setup() {
  const read = vi.fn(async (): Promise<AdminPerformanceFinance> => ({
    period: {
      from: period.from,
      to: period.to,
      brandReceipts: "900.00",
      creatorPayouts: "500.00",
    },
    current: {
      brandOutstanding: "1.00",
      brandCredits: "2.00",
      creatorUnpaid: "3.00",
      creatorOverpayments: "4.00",
    },
    brands: [{ id: "b", periodReceipts: "9.00", outstanding: "8.00" }],
    creators: [
      { id: m1, periodPayouts: "10.00", unpaid: "5.00" },
      { id: outsider, periodPayouts: "99.00", unpaid: "99.00" },
    ],
  }));
  const members = vi.fn(async () => [{ id: m1 }, { id: m2 }]);
  return { read, members, use: readTeamPerformanceFinance(read, members) };
}

describe("readTeamPerformanceFinance", () => {
  it("rejects a creator who is not a team lead", async () => {
    const { use, read } = setup();
    await expect(
      use(creator, { ...period, creatorIds: [m1] }),
    ).resolves.toEqual({ ok: false, error: "wrong_capability" });
    expect(read).not.toHaveBeenCalled();
  });

  it("reads any non-member id as not found", async () => {
    const { use, read, members } = setup();
    await expect(
      use(lead, { ...period, creatorIds: [m1, outsider] }),
    ).resolves.toEqual({ ok: false, error: "not_found" });
    expect(members).toHaveBeenCalledWith(leadId);
    expect(read).not.toHaveBeenCalled();
  });

  it("rejects malformed input", async () => {
    const { use } = setup();
    await expect(
      use(lead, { from: "2026-10-26", to: "2026-10-01", creatorIds: [] }),
    ).resolves.toEqual({ ok: false, error: "invalid_input" });
    await expect(
      use(lead, { ...period, creatorIds: ["nope"] }),
    ).resolves.toEqual({ ok: false, error: "invalid_input" });
  });

  it("returns only the requested members' entries and no platform figures", async () => {
    const { use, read } = setup();
    const result = await use(lead, { ...period, creatorIds: [m1] });
    expect(read).toHaveBeenCalledWith({
      ...period,
      brandIds: [],
      creatorIds: [m1],
    });
    expect(result).toEqual({
      ok: true,
      value: { creators: [{ id: m1, periodPayouts: "10.00", unpaid: "5.00" }] },
    });
    if (!result.ok) throw new Error("expected ok");
    expect(Object.keys(result.value)).toEqual(["creators"]);
    expect(result.value).not.toHaveProperty("period");
    expect(result.value).not.toHaveProperty("current");
    expect(result.value).not.toHaveProperty("brands");
  });
});
