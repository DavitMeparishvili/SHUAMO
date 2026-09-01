export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "SUSPENDED"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export function isActive(status: ApprovalStatus): boolean {
  return status === "APPROVED";
}
