import { isActive } from "../domain/approval";
import type { Viewer } from "../domain/viewer";
import type { AccountRepository } from "../ports/account-repository";

export function resolveViewer(dependencies: { accounts: AccountRepository }) {
  return async (sessionUserId: string | undefined): Promise<Viewer> => {
    if (sessionUserId === undefined) return { kind: "anonymous" };
    const account = await dependencies.accounts.findByUserId(sessionUserId);
    if (account === undefined) return { kind: "anonymous" };

    if (account.brand !== undefined && isActive(account.brand.status)) {
      return {
        kind: "brand",
        userId: account.userId,
        brandId: account.brand.id,
        brandName: account.brand.name,
        isAdmin: account.isAdmin,
      };
    }
    if (account.creator !== undefined && isActive(account.creator.status)) {
      return {
        kind: "creator",
        userId: account.userId,
        creatorId: account.creator.id,
        displayName: account.creator.displayName,
        isAdmin: account.isAdmin,
      };
    }
    if (account.isAdmin) return { kind: "admin", userId: account.userId };
    return { kind: "anonymous" };
  };
}
