import { z } from "zod";
import { requireAdmin, type Viewer } from "@/src/modules/identity";
import { err, ok } from "@/src/modules/shared";
import type {
  AdminPerformanceFinance,
  PerformanceFinanceQuery,
} from "../ports/admin-performance-finance";
import { transferDate } from "../domain/finance-input";
export const readAdminPerformanceFinance =
  (read: (q: PerformanceFinanceQuery) => Promise<AdminPerformanceFinance>) =>
  async (viewer: Viewer, q: PerformanceFinanceQuery) => {
    const access = requireAdmin(viewer);
    if (!access.ok) return access;
    try {
      transferDate(q.from);
      transferDate(q.to);
      if (
        q.from > q.to ||
        !z.array(z.uuid()).safeParse([...q.brandIds, ...q.creatorIds]).success
      )
        return err("invalid_input" as const);
    } catch {
      return err("invalid_input" as const);
    }
    return ok(await read(q));
  };
