import { z } from "zod";
import { requireTeamLead, type Viewer } from "@/src/modules/identity";
import { err, ok } from "@/src/modules/shared";
import type {
  AdminPerformanceQuery,
  AdminPerformanceReport,
  AdminPerformanceRepository,
} from "../ports/admin-performance";

// The scope is internal: it never travels back into links or filters.
const unscoped = (report: AdminPerformanceReport): AdminPerformanceReport => ({
  ...report,
  query: { ...report.query, teamLeadId: undefined },
});

// A lead's "My team" list: the admin creators breakdown, limited to the
// creators whose team lead is the viewer. Account filters are ignored.
export const readTeamPerformance =
  (repo: Pick<AdminPerformanceRepository, "report">) =>
  async (viewer: Viewer, query: AdminPerformanceQuery) => {
    const access = requireTeamLead(viewer);
    if (!access.ok) return access;
    const report = await repo.report({
      ...query,
      tab: "creators",
      teamLeadId: access.value.creatorId,
      creatorId: undefined,
      brandId: undefined,
      q: "",
      productStatus: "ALL",
    });
    return ok(unscoped(report));
  };

// One member's admin report. Anyone who is not on the viewer's team reads as
// not found, so the URL does not reveal whether that creator exists.
export const readTeamMemberPerformance =
  (
    repo: Pick<AdminPerformanceRepository, "report">,
    isMember: (leadId: string, creatorId: string) => Promise<boolean>,
  ) =>
  async (viewer: Viewer, memberId: string, query: AdminPerformanceQuery) => {
    const access = requireTeamLead(viewer);
    if (!access.ok) return access;
    if (!z.uuid().safeParse(memberId).success)
      return err("invalid_input" as const);
    if (!(await isMember(access.value.creatorId, memberId)))
      return err("not_found" as const);
    const report = await repo.report({
      ...query,
      tab: query.tab === "creators" ? "overview" : query.tab,
      creatorId: memberId,
      teamLeadId: undefined,
      brandId: undefined,
      q: "",
      productStatus: "ALL",
    });
    return ok(unscoped(report));
  };
