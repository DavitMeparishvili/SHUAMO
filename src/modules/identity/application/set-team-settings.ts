import { z } from "zod";
import { err, ok, type Result } from "@/src/modules/shared";
import { requireAdmin } from "../http/require-viewer";
import type { TeamRuleError } from "../domain/team";
import type { Viewer } from "../domain/viewer";
import type { TeamRepository } from "../ports/team-repository";

const inputSchema = z.object({
  id: z.uuid(),
  isTeamLead: z.boolean(),
  teamLeadId: z.uuid().nullable(),
});

export type TeamSettingsError =
  | "unauthenticated"
  | "wrong_capability"
  | "invalid_input"
  | "not_found"
  | TeamRuleError;

export const setTeamSettings =
  (repository: TeamRepository) =>
  async (
    viewer: Viewer,
    input: unknown,
  ): Promise<
    Result<
      { isTeamLead: boolean; teamLeadId: string | null },
      TeamSettingsError
    >
  > => {
    const access = requireAdmin(viewer);
    if (!access.ok) return err(access.error);
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return err("invalid_input");
    const { id, isTeamLead, teamLeadId } = parsed.data;
    const saved = await repository.setSettings({
      actorId: access.value.userId,
      creatorId: id,
      isTeamLead,
      teamLeadId,
    });
    if (!saved.ok) return err(saved.error);
    return ok({ isTeamLead, teamLeadId });
  };
