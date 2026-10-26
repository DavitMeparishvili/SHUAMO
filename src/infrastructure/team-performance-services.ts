import { prismaTeamRepository } from "@/src/modules/identity";
import {
  prismaAdminPerformance,
  readTeamMemberPerformance,
  readTeamPerformance,
} from "@/src/modules/conversions";
import {
  prismaAdminPerformanceFinance,
  readTeamPerformanceFinance,
} from "@/src/modules/finance";
export const teamPerformanceReport = readTeamPerformance(
  prismaAdminPerformance,
);
export const teamMemberPerformanceReport = readTeamMemberPerformance(
  prismaAdminPerformance,
  (leadId, creatorId) => prismaTeamRepository.isMember(leadId, creatorId),
);
export const teamPerformanceFinance = readTeamPerformanceFinance(
  prismaAdminPerformanceFinance,
  (leadId) => prismaTeamRepository.members(leadId),
);
