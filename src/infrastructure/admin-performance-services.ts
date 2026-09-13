import {
  currentViewer,
  requireAdmin,
  type Viewer,
} from "@/src/modules/identity";
import {
  readAdminPerformance,
  readAdminProductPerformance,
  prismaAdminPerformance,
} from "@/src/modules/conversions";
import {
  readAdminPerformanceFinance,
  prismaAdminPerformanceFinance,
  createAdminPerformanceExport,
} from "@/src/modules/finance";
export const adminPerformanceReport = readAdminPerformance(
  prismaAdminPerformance,
);
export const adminProductPerformanceReport = readAdminProductPerformance(
  prismaAdminPerformance,
);
export const adminPerformanceFinance = readAdminPerformanceFinance(
  prismaAdminPerformanceFinance,
);
export async function adminPerformanceOptions(viewer: Viewer) {
  if (!requireAdmin(viewer).ok) return { brands: [], creators: [] };
  return prismaAdminPerformance.options();
}
export const adminPerformanceExport = createAdminPerformanceExport({
  viewer: currentViewer,
  reports: prismaAdminPerformance,
  finance: prismaAdminPerformanceFinance,
});
