import { prisma } from "@/src/infrastructure/db/client";
import { checkTeamSettings } from "../domain/team";
import type { TeamRepository } from "../ports/team-repository";

export const prismaTeamRepository: TeamRepository = {
  async listLeads() {
    return prisma.creator.findMany({
      where: {
        isTeamLead: true,
        status: "APPROVED",
        user: { accessDisabled: false },
      },
      select: { id: true, displayName: true },
      orderBy: [{ displayName: "asc" }, { id: "asc" }],
    });
  },

  async isMember(leadId, creatorId) {
    const member = await prisma.creator.findFirst({
      where: { id: creatorId, teamLeadId: leadId },
      select: { id: true },
    });
    return member !== null;
  },

  async members(leadId) {
    const rows = await prisma.creator.findMany({
      where: { teamLeadId: leadId },
      select: {
        id: true,
        displayName: true,
        status: true,
        user: { select: { accessDisabled: true } },
        _count: { select: { links: true } },
      },
      orderBy: [{ displayName: "asc" }, { id: "asc" }],
    });
    return rows.map((row) => ({
      id: row.id,
      displayName: row.displayName,
      status: row.status,
      accessDisabled: row.user.accessDisabled,
      linkCount: row._count.links,
    }));
  },

  async settings(creatorId) {
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        isTeamLead: true,
        teamLeadId: true,
        teamLead: { select: { displayName: true } },
        _count: { select: { teamMembers: true } },
      },
    });
    if (creator === null) return undefined;
    return {
      isTeamLead: creator.isTeamLead,
      teamLeadId: creator.teamLeadId,
      teamLeadName: creator.teamLead?.displayName ?? null,
      memberCount: creator._count.teamMembers,
    };
  },

  setSettings: (input) =>
    prisma.$transaction(async (tx) => {
      // Lock the creator, and the chosen lead, in id order so two admins
      // editing opposite sides of one team cannot both pass the rules.
      const lockIds = [input.creatorId, input.teamLeadId]
        .filter((id): id is string => id !== null)
        .sort();
      for (const id of lockIds)
        await tx.$queryRaw`SELECT id FROM creator WHERE id=${id}::uuid FOR UPDATE`;

      const current = await tx.creator.findUnique({
        where: { id: input.creatorId },
        select: {
          isTeamLead: true,
          teamLeadId: true,
          _count: { select: { teamMembers: true } },
        },
      });
      if (current === null) return { ok: false, error: "not_found" } as const;
      const roleChanged = current.isTeamLead !== input.isTeamLead;
      const leadChanged = current.teamLeadId !== input.teamLeadId;
      // Saving unchanged values is a no-op, even for a member whose lead has
      // since been switched off.
      if (!roleChanged && !leadChanged) return { ok: true } as const;

      const lead =
        input.teamLeadId === null
          ? null
          : await tx.creator.findUnique({
              where: { id: input.teamLeadId },
              select: { id: true, isTeamLead: true },
            });
      const error = checkTeamSettings({
        creatorId: input.creatorId,
        isTeamLead: input.isTeamLead,
        teamLeadId: input.teamLeadId,
        memberCount: current._count.teamMembers,
        lead,
      });
      if (error !== undefined) return { ok: false, error } as const;

      await tx.creator.update({
        where: { id: input.creatorId },
        data: { isTeamLead: input.isTeamLead, teamLeadId: input.teamLeadId },
      });
      if (roleChanged)
        await tx.auditEvent.create({
          data: {
            actorId: input.actorId,
            action: "creator.team_lead_role_changed",
            entityType: "creator",
            entityId: input.creatorId,
            changes: { from: current.isTeamLead, to: input.isTeamLead },
          },
        });
      if (leadChanged)
        await tx.auditEvent.create({
          data: {
            actorId: input.actorId,
            action: "creator.team_lead_changed",
            entityType: "creator",
            entityId: input.creatorId,
            changes: { from: current.teamLeadId, to: input.teamLeadId },
          },
        });
      return { ok: true } as const;
    }),
};
