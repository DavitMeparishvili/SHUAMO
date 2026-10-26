import { describe, expect, it, vi } from "vitest";
import { setTeamSettings } from "./set-team-settings";
import type { TeamRepository } from "../ports/team-repository";

const id = "00000000-0000-4000-8000-000000000001";
const leadId = "00000000-0000-4000-8000-000000000002";

function setup(
  result: Awaited<ReturnType<TeamRepository["setSettings"]>> = { ok: true },
) {
  const setSettings = vi.fn(async () => result);
  const repository: TeamRepository = {
    listLeads: async () => [],
    isMember: async () => false,
    members: async () => [],
    settings: async () => undefined,
    setSettings,
  };
  return { setSettings, save: setTeamSettings(repository) };
}

describe("admin team settings", () => {
  it("rejects a non-admin before persistence", async () => {
    const { save, setSettings } = setup();
    expect(
      await save(
        {
          kind: "creator",
          userId: id,
          creatorId: id,
          displayName: "Creator",
          isAdmin: false,
        },
        { id, isTeamLead: true, teamLeadId: null },
      ),
    ).toEqual({ ok: false, error: "wrong_capability" });
    expect(setSettings).not.toHaveBeenCalled();
  });

  it("rejects a malformed body", async () => {
    const { save, setSettings } = setup();
    expect(
      await save(
        { kind: "admin", userId: id },
        { id, isTeamLead: "yes", teamLeadId: null },
      ),
    ).toEqual({ ok: false, error: "invalid_input" });
    expect(
      await save(
        { kind: "admin", userId: id },
        { id, isTeamLead: false, teamLeadId: "not-a-uuid" },
      ),
    ).toEqual({ ok: false, error: "invalid_input" });
    expect(setSettings).not.toHaveBeenCalled();
  });

  it("passes a repository error through", async () => {
    const { save } = setup({ ok: false, error: "not_found" });
    expect(
      await save(
        { kind: "admin", userId: id },
        { id, isTeamLead: false, teamLeadId: null },
      ),
    ).toEqual({ ok: false, error: "not_found" });
  });

  it("saves with the admin identity and returns the input values", async () => {
    const { save, setSettings } = setup();
    expect(
      await save(
        { kind: "admin", userId: id },
        { id, isTeamLead: false, teamLeadId: leadId },
      ),
    ).toEqual({ ok: true, value: { isTeamLead: false, teamLeadId: leadId } });
    expect(setSettings).toHaveBeenCalledWith({
      actorId: id,
      creatorId: id,
      isTeamLead: false,
      teamLeadId: leadId,
    });
  });
});
