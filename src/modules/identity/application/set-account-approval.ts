import { z } from "zod";
import { err, ok } from "@/src/modules/shared";
import { requireAdmin } from "../http/require-viewer";
import type { Viewer } from "../domain/viewer";
import type {
  AdminAccountApprovalRepository,
  AdminAccountKind,
  AdminAccountStatus,
} from "../ports/account-repository";

const inputSchema = z.object({
  kind: z.enum(["brand", "creator"]),
  id: z.uuid(),
  status: z.enum(["APPROVED", "SUSPENDED"]),
});

export type AdminAccountApprovalInput = {
  kind: AdminAccountKind;
  id: string;
  status: AdminAccountStatus;
};

export type AdminAccountApprovalError =
  "unauthenticated" | "wrong_capability" | "invalid_input" | "not_found";

export const setAdminAccountApproval =
  (repository: AdminAccountApprovalRepository) =>
  async (viewer: Viewer, input: unknown) => {
    const access = requireAdmin(viewer);
    if (!access.ok) return err(access.error as AdminAccountApprovalError);
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return err("invalid_input" as const);
    const changed = await repository.setStatus({
      actorId: access.value.userId,
      ...parsed.data,
    });
    return changed ? ok(changed) : err("not_found" as const);
  };
