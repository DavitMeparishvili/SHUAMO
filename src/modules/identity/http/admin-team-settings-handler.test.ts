import { describe, expect, it, vi } from "vitest";
import { createAdminTeamSettingsHandler } from "./admin-team-settings-handler";
import type { TeamRepository } from "../ports/team-repository";

const id = "00000000-0000-4000-8000-000000000001";
const leadId = "00000000-0000-4000-8000-000000000002";
const request = (body: string) =>
  new Request(`http://localhost/api/admin/creators/${id}/team`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
const context = { params: Promise.resolve({ id }) };

function repository(
  setSettings: TeamRepository["setSettings"],
): TeamRepository {
  return {
    listLeads: async () => [],
    isMember: async () => false,
    members: async () => [],
    settings: async () => undefined,
    setSettings,
  };
}

describe("admin team settings endpoint", () => {
  it("returns 401 and never writes for an unauthenticated request", async () => {
    const setSettings = vi.fn();
    const handler = createAdminTeamSettingsHandler({
      viewer: async () => ({ kind: "anonymous" }),
      repository: repository(setSettings),
    });
    const response = await handler(
      request(JSON.stringify({ isTeamLead: true, teamLeadId: null })),
      context,
    );
    expect(response.status).toBe(401);
    expect(setSettings).not.toHaveBeenCalled();
  });

  it("returns 400 for a body that is not JSON", async () => {
    const handler = createAdminTeamSettingsHandler({
      viewer: async () => ({ kind: "admin", userId: id }),
      repository: repository(vi.fn()),
    });
    expect((await handler(request("{"), context)).status).toBe(400);
  });

  it("returns 409 with the rule that blocked the change", async () => {
    const handler = createAdminTeamSettingsHandler({
      viewer: async () => ({ kind: "admin", userId: id }),
      repository: repository(async () => ({
        ok: false,
        error: "has_members",
      })),
    });
    const response = await handler(
      request(JSON.stringify({ isTeamLead: false, teamLeadId: leadId })),
      context,
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "has_members" });
  });

  it("uses the route id rather than one in the body", async () => {
    const setSettings = vi.fn(async () => ({ ok: true }) as const);
    const handler = createAdminTeamSettingsHandler({
      viewer: async () => ({ kind: "admin", userId: id }),
      repository: repository(setSettings),
    });
    const response = await handler(
      request(
        JSON.stringify({ id: leadId, isTeamLead: true, teamLeadId: null }),
      ),
      context,
    );
    expect(response.status).toBe(200);
    expect(setSettings).toHaveBeenCalledWith({
      actorId: id,
      creatorId: id,
      isTeamLead: true,
      teamLeadId: null,
    });
  });
});
