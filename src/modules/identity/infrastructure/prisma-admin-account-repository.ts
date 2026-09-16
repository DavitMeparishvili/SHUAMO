import { prisma } from "@/src/infrastructure/db/client";
import type { Prisma } from "@/src/generated/prisma/client";
import type {
  AdminAccountApprovalRepository,
  AdminAccountKind,
  AdminAccountStatus,
} from "../ports/account-repository";
import type { ApprovalStatus } from "../domain/approval";

async function updateStatus(
  tx: Prisma.TransactionClient,
  kind: AdminAccountKind,
  id: string,
  status: AdminAccountStatus,
) {
  if (kind === "brand") {
    const current = await tx.brand.findUnique({
      where: { id },
      select: {
        status: true,
        userId: true,
        user: { select: { accessDisabled: true } },
      },
    });
    if (!current) return undefined;
    const previousStatus: ApprovalStatus = current.user.accessDisabled
      ? "SUSPENDED"
      : current.status;
    if (status === "APPROVED" && current.status !== "APPROVED")
      await tx.brand.update({
        where: { id },
        data: { status: "APPROVED" },
      });
    if (current.user.accessDisabled !== (status === "SUSPENDED"))
      await tx.appUser.update({
        where: { id: current.userId },
        data: { accessDisabled: status === "SUSPENDED" },
      });
    return previousStatus;
  }
  const current = await tx.creator.findUnique({
    where: { id },
    select: {
      status: true,
      userId: true,
      user: { select: { accessDisabled: true } },
    },
  });
  if (!current) return undefined;
  const previousStatus: ApprovalStatus = current.user.accessDisabled
    ? "SUSPENDED"
    : current.status;
  if (status === "APPROVED" && current.status !== "APPROVED")
    await tx.creator.update({
      where: { id },
      data: { status: "APPROVED" },
    });
  if (current.user.accessDisabled !== (status === "SUSPENDED"))
    await tx.appUser.update({
      where: { id: current.userId },
      data: { accessDisabled: status === "SUSPENDED" },
    });
  return previousStatus;
}

export const prismaAdminAccountApprovalRepository: AdminAccountApprovalRepository =
  {
    setStatus: (input) =>
      prisma.$transaction(async (tx) => {
        const previousStatus = await updateStatus(
          tx,
          input.kind,
          input.id,
          input.status,
        );
        if (!previousStatus) return undefined;
        if (previousStatus !== input.status)
          await tx.auditEvent.create({
            data: {
              actorId: input.actorId,
              action: "account.approval_changed",
              entityType: input.kind,
              entityId: input.id,
              changes: { from: previousStatus, to: input.status },
            },
          });
        return { previousStatus, status: input.status };
      }),
  };
