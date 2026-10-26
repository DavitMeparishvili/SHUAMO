import {
  createAdminTeamSettingsHandler,
  currentViewer,
  prismaTeamRepository,
} from "@/src/modules/identity";

export const PATCH = createAdminTeamSettingsHandler({
  viewer: currentViewer,
  repository: prismaTeamRepository,
});
