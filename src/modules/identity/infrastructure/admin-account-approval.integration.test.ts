import { expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { resolveLink } from "@/src/modules/partnerships";
import { seedLink } from "@/src/test/fixtures/accounts";
import { prismaLinkLookup } from "@/src/modules/tracking";
import { prismaAdminAccountApprovalRepository } from "./prisma-admin-account-repository";

it("changes account access atomically without modifying existing links", async () => {
  const fixture = await seedLink();
  const authUser = await prisma.user.create({
    data: {
      email: `${crypto.randomUUID()}@admin.example.test`,
      name: "Approval admin",
      emailVerified: true,
    },
  });
  await prisma.appUser.update({
    where: { id: authUser.id },
    data: { isAdmin: true },
  });

  await expect(
    prismaAdminAccountApprovalRepository.setStatus({
      actorId: authUser.id,
      kind: "brand",
      id: fixture.brand.id,
      status: "SUSPENDED",
    }),
  ).resolves.toEqual({
    previousStatus: "APPROVED",
    status: "SUSPENDED",
  });

  const [brand, link, snapshot, audits] = await Promise.all([
    prisma.brand.findUniqueOrThrow({
      where: { id: fixture.brand.id },
      include: { user: true },
    }),
    prisma.trackingLink.findUniqueOrThrow({ where: { id: fixture.link.id } }),
    prismaLinkLookup.byCode(fixture.link.code),
    prisma.auditEvent.findMany({
      where: { entityType: "brand", entityId: fixture.brand.id },
    }),
  ]);
  expect(brand.status).toBe("APPROVED");
  expect(brand.user.accessDisabled).toBe(true);
  expect(link.status).toBe("ACTIVE");
  expect(snapshot && resolveLink(snapshot.state)).toEqual({ active: true });
  expect(audits).toHaveLength(1);
  expect(audits[0]).toMatchObject({
    actorId: authUser.id,
    action: "account.approval_changed",
    changes: { from: "APPROVED", to: "SUSPENDED" },
  });

  await prismaAdminAccountApprovalRepository.setStatus({
    actorId: authUser.id,
    kind: "brand",
    id: fixture.brand.id,
    status: "SUSPENDED",
  });
  expect(
    await prisma.auditEvent.count({
      where: { entityType: "brand", entityId: fixture.brand.id },
    }),
  ).toBe(1);
});
