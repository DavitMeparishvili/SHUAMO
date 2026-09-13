import { z } from "zod";
import { requireAdmin, type Viewer } from "@/src/modules/identity";
import { ok, err } from "@/src/modules/shared";
import type {
  AdminPerformanceRepository,
  AdminPerformanceQuery,
} from "../ports/admin-performance";
export const readAdminPerformance =
  (repo: AdminPerformanceRepository) =>
  async (viewer: Viewer, query: AdminPerformanceQuery) => {
    const access = requireAdmin(viewer);
    if (!access.ok) return access;
    return ok(await repo.report(query));
  };
export const readAdminProductPerformance =
  (repo: AdminPerformanceRepository) =>
  async (viewer: Viewer, id: string, query: AdminPerformanceQuery) => {
    const access = requireAdmin(viewer);
    if (!access.ok) return access;
    if (!z.uuid().safeParse(id).success) return err("invalid_input" as const);
    const value = await repo.productReport(id, query);
    return value ? ok(value) : err("not_found" as const);
  };
