import { describe, expect, it } from "vitest";
import { checkTeamSettings } from "./team";

const creatorId = "00000000-0000-4000-8000-000000000001";
const leadId = "00000000-0000-4000-8000-000000000002";
const lead = { id: leadId, isTeamLead: true };

describe("team settings rules", () => {
  it("rejects a creator as their own lead", () => {
    expect(
      checkTeamSettings({
        creatorId,
        isTeamLead: false,
        teamLeadId: creatorId,
        memberCount: 0,
        lead: { id: creatorId, isTeamLead: true },
      }),
    ).toBe("self_lead");
  });

  it("rejects a lead whose toggle is off", () => {
    expect(
      checkTeamSettings({
        creatorId,
        isTeamLead: false,
        teamLeadId: leadId,
        memberCount: 0,
        lead: { id: leadId, isTeamLead: false },
      }),
    ).toBe("not_a_lead");
  });

  it("rejects a team lead who also has a lead", () => {
    expect(
      checkTeamSettings({
        creatorId,
        isTeamLead: true,
        teamLeadId: leadId,
        memberCount: 0,
        lead,
      }),
    ).toBe("lead_cannot_have_lead");
  });

  it("rejects giving a lead to a creator who still has members", () => {
    expect(
      checkTeamSettings({
        creatorId,
        isTeamLead: false,
        teamLeadId: leadId,
        memberCount: 1,
        lead,
      }),
    ).toBe("has_members");
  });

  it("accepts a lead toggle on a creator with members", () => {
    expect(
      checkTeamSettings({
        creatorId,
        isTeamLead: true,
        teamLeadId: null,
        memberCount: 3,
        lead: null,
      }),
    ).toBeUndefined();
  });

  it("accepts a member assignment to a current lead", () => {
    expect(
      checkTeamSettings({
        creatorId,
        isTeamLead: false,
        teamLeadId: leadId,
        memberCount: 0,
        lead,
      }),
    ).toBeUndefined();
  });
});
