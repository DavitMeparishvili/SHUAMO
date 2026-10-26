// Teams are one level deep: a lead has members, a member has a lead, and
// nobody is both. Nothing is detached automatically, so each blocked change
// names the side the admin must clear first.
export type TeamRuleError =
  "self_lead" | "not_a_lead" | "lead_cannot_have_lead" | "has_members";

export function checkTeamSettings(input: {
  creatorId: string;
  isTeamLead: boolean;
  teamLeadId: string | null;
  memberCount: number;
  lead: { id: string; isTeamLead: boolean } | null;
}): TeamRuleError | undefined {
  if (input.teamLeadId === null) return undefined;
  if (input.teamLeadId === input.creatorId) return "self_lead";
  if (input.isTeamLead) return "lead_cannot_have_lead";
  // Members count even while this creator's lead toggle is off.
  if (input.memberCount > 0) return "has_members";
  if (input.lead === null || !input.lead.isTeamLead) return "not_a_lead";
  return undefined;
}
