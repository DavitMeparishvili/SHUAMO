import type { ApprovalStatus } from "../domain/approval";

export interface AccountRecord {
  userId: string;
  isAdmin: boolean;
  accessDisabled: boolean;
  brand?: { id: string; name: string; status: ApprovalStatus };
  creator?: { id: string; displayName: string; status: ApprovalStatus };
}

export interface AccountRepository {
  findByUserId(userId: string): Promise<AccountRecord | undefined>;
}

export type AdminAccountKind = "brand" | "creator";
export type AdminAccountStatus = "APPROVED" | "SUSPENDED";

export interface AdminAccountApprovalRepository {
  setStatus(input: {
    actorId: string;
    kind: AdminAccountKind;
    id: string;
    status: AdminAccountStatus;
  }): Promise<
    | {
        previousStatus: ApprovalStatus;
        status: AdminAccountStatus;
      }
    | undefined
  >;
}

export interface BrandKeyRecord {
  id: string;
  keyHash: string;
  status: ApprovalStatus;
  vatRegistered: boolean;
}

export interface BrandRepository {
  findById(id: string): Promise<{ id: string } | undefined>;
  findByKeyPrefix(prefix: string): Promise<BrandKeyRecord | undefined>;
  updateKey(
    brandId: string,
    key: { keyPrefix: string; keyHash: string },
  ): Promise<void>;
}
