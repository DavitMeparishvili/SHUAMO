import { z } from "zod";
import { requireTeamLead, type Viewer } from "@/src/modules/identity";
import { err, ok } from "@/src/modules/shared";
import type {
  AdminPerformanceFinance,
  PerformanceFinanceQuery,
  TeamPerformanceFinance,
} from "../ports/admin-performance-finance";
import { transferDate } from "../domain/finance-input";

// A lead's view of the admin creator finance figures: only their own members,
// and only the per-creator entries. Platform and brand figures are dropped.
export const readTeamPerformanceFinance =
  (
    read: (q: PerformanceFinanceQuery) => Promise<AdminPerformanceFinance>,
    members: (leadId: string) => Promise<{ id: string }[]>,
  ) =>
  async (
    viewer: Viewer,
    q: { from: string; to: string; creatorIds: string[] },
  ) => {
    const access = requireTeamLead(viewer);
    if (!access.ok) return access;
    try {
      transferDate(q.from);
      transferDate(q.to);
      if (q.from > q.to || !z.array(z.uuid()).safeParse(q.creatorIds).success)
        return err("invalid_input" as const);
    } catch {
      return err("invalid_input" as const);
    }
    const team = new Set(
      (await members(access.value.creatorId)).map((member) => member.id),
    );
    if (q.creatorIds.some((id) => !team.has(id)))
      return err("not_found" as const);
    if (!q.creatorIds.length) return ok({ creators: [] });
    const requested = new Set(q.creatorIds);
    const finance = await read({
      from: q.from,
      to: q.to,
      brandIds: [],
      creatorIds: q.creatorIds,
    });
    return ok({
      creators: finance.creators
        .filter((creator) => requested.has(creator.id))
        .map(({ id, periodPayouts, unpaid }) => ({
          id,
          periodPayouts,
          unpaid,
        })),
    } satisfies TeamPerformanceFinance);
  };
