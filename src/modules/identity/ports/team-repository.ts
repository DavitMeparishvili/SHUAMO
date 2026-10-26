import type { ApprovalStatus } from "../domain/approval";
import type { TeamRuleError } from "../domain/team";

export interface TeamMember {
  id: string;
  displayName: string;
  status: ApprovalStatus;
  accessDisabled: boolean;
  // Every tracking link the member owns, whatever its status.
  linkCount: number;
}

export interface TeamSettings {
  isTeamLead: boolean;
  teamLeadId: string | null;
  // The assigned lead's name, even when that lead is no longer active.
  teamLeadName: string | null;
  memberCount: number;
}

export interface TeamRepository {
  // Leads a creator may pick: approved, with access, ordered by name.
  listLeads(): Promise<{ id: string; displayName: string }[]>;
  isMember(leadId: string, creatorId: string): Promise<boolean>;
  members(leadId: string): Promise<TeamMember[]>;
  settings(creatorId: string): Promise<TeamSettings | undefined>;
  setSettings(input: {
    actorId: string;
    creatorId: string;
    isTeamLead: boolean;
    teamLeadId: string | null;
  }): Promise<{ ok: true } | { ok: false; error: "not_found" | TeamRuleError }>;
}
