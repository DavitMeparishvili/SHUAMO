import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { seedCreator, seedLink } from "@/src/test/fixtures/accounts";
import { prismaTeamRepository } from "./prisma-team-repository";

async function seedAdmin() {
  const user = await prisma.user.create({
    data: {
      email: `${crypto.randomUUID()}@admin.example.test`,
      name: "Team admin",
      emailVerified: true,
    },
  });
  await prisma.appUser.update({
    where: { id: user.id },
    data: { isAdmin: true },
  });
  return user.id;
}

const audits = (creatorId: string) =>
  prisma.auditEvent.findMany({
    where: { entityType: "creator", entityId: creatorId },
    orderBy: { at: "asc" },
  });

describe("prisma team repository", () => {
  it("toggles a lead and assigns a member with audit events", async () => {
    const actorId = await seedAdmin();
    const [lead, member] = await Promise.all([seedCreator(), seedCreator()]);

    await expect(
      prismaTeamRepository.setSettings({
        actorId,
        creatorId: lead.id,
        isTeamLead: true,
        teamLeadId: null,
      }),
    ).resolves.toEqual({ ok: true });
    expect(await audits(lead.id)).toEqual([
      expect.objectContaining({
        actorId,
        action: "creator.team_lead_role_changed",
        changes: { from: false, to: true },
      }),
    ]);

    await expect(
      prismaTeamRepository.setSettings({
        actorId,
        creatorId: member.id,
        isTeamLead: false,
        teamLeadId: lead.id,
      }),
    ).resolves.toEqual({ ok: true });
    expect(await audits(member.id)).toEqual([
      expect.objectContaining({
        actorId,
        action: "creator.team_lead_changed",
        changes: { from: null, to: lead.id },
      }),
    ]);
    await expect(prismaTeamRepository.settings(lead.id)).resolves.toEqual({
      isTeamLead: true,
      teamLeadId: null,
      teamLeadName: null,
      memberCount: 1,
    });
  });

  it("keeps members when a lead is switched off and blocks a nested team", async () => {
    const actorId = await seedAdmin();
    const lead = await seedCreator({ isTeamLead: true });
    const otherLead = await seedCreator({ isTeamLead: true });
    const member = await seedCreator({ teamLeadId: lead.id });

    await prismaTeamRepository.setSettings({
      actorId,
      creatorId: lead.id,
      isTeamLead: false,
      teamLeadId: null,
    });
    expect(
      (await prisma.creator.findUniqueOrThrow({ where: { id: member.id } }))
        .teamLeadId,
    ).toBe(lead.id);
    await expect(prismaTeamRepository.settings(member.id)).resolves.toEqual({
      isTeamLead: false,
      teamLeadId: lead.id,
      teamLeadName: "Test creator",
      memberCount: 0,
    });

    await expect(
      prismaTeamRepository.setSettings({
        actorId,
        creatorId: lead.id,
        isTeamLead: false,
        teamLeadId: otherLead.id,
      }),
    ).resolves.toEqual({ ok: false, error: "has_members" });
    expect(
      await prisma.creator.findUniqueOrThrow({ where: { id: lead.id } }),
    ).toMatchObject({ isTeamLead: false, teamLeadId: null });
  });

  it("returns not_found for an unknown creator", async () => {
    const actorId = await seedAdmin();
    await expect(
      prismaTeamRepository.setSettings({
        actorId,
        creatorId: crypto.randomUUID(),
        isTeamLead: true,
        teamLeadId: null,
      }),
    ).resolves.toEqual({ ok: false, error: "not_found" });
  });

  it("writes no audit event when nothing changed", async () => {
    const actorId = await seedAdmin();
    const lead = await seedCreator({ isTeamLead: true });
    await expect(
      prismaTeamRepository.setSettings({
        actorId,
        creatorId: lead.id,
        isTeamLead: true,
        teamLeadId: null,
      }),
    ).resolves.toEqual({ ok: true });
    expect(await audits(lead.id)).toHaveLength(0);
  });

  it("lists only approved leads with access", async () => {
    const active = await seedCreator({ isTeamLead: true });
    await seedCreator({ isTeamLead: true, status: "SUSPENDED" });
    const disabled = await seedCreator({ isTeamLead: true });
    await prisma.appUser.update({
      where: { id: disabled.userId },
      data: { accessDisabled: true },
    });
    await seedCreator();
    expect(await prismaTeamRepository.listLeads()).toEqual([
      { id: active.id, displayName: active.displayName },
    ]);
  });

  it("counts every member link and scopes membership to the lead", async () => {
    const lead = await seedCreator({ isTeamLead: true });
    const otherLead = await seedCreator({ isTeamLead: true });
    const { creator: member, product } = await seedLink();
    await prisma.creator.update({
      where: { id: member.id },
      data: { teamLeadId: lead.id },
    });
    await prisma.trackingLink.create({
      data: {
        productId: product.id,
        creatorId: member.id,
        code: crypto.randomUUID().replaceAll("-", "").slice(0, 10),
        commissionType: "FIXED",
        commissionValue: "10.0000",
        status: "DISABLED",
      },
    });
    const outsider = await seedCreator({ teamLeadId: otherLead.id });

    expect(await prismaTeamRepository.members(lead.id)).toEqual([
      {
        id: member.id,
        displayName: member.displayName,
        status: "APPROVED",
        accessDisabled: false,
        linkCount: 2,
      },
    ]);
    expect(await prismaTeamRepository.isMember(lead.id, member.id)).toBe(true);
    expect(await prismaTeamRepository.isMember(lead.id, outsider.id)).toBe(
      false,
    );
  });
});
