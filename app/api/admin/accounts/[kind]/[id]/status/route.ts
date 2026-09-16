import {
  createAdminAccountStatusHandler,
  currentViewer,
  prismaAdminAccountApprovalRepository,
} from "@/src/modules/identity";

export const PATCH = createAdminAccountStatusHandler({
  viewer: currentViewer,
  repository: prismaAdminAccountApprovalRepository,
});
