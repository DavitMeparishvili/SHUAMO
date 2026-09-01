import type { Result } from "@/src/modules/shared";

interface DecisionScope {
  partnerships: {
    findForBrand(
      brandId: string,
      partnershipId: string,
    ): Promise<
      | {
          id: string;
          brandId: string;
          creatorId: string;
          status: "PENDING" | "APPROVED" | "REJECTED";
        }
      | undefined
    >;
    setStatus(id: string, status: "APPROVED" | "REJECTED"): Promise<void>;
  };
}

export interface DecidePartnershipDeps extends DecisionScope {
  transaction?<T>(work: (scope: DecisionScope) => Promise<T>): Promise<T>;
}

export function decidePartnership(deps: DecidePartnershipDeps) {
  return async (
    brandId: string,
    partnershipId: string,
    decision: "APPROVE" | "REJECT",
  ): Promise<Result<void, "not_found">> => {
    if (deps.transaction) {
      return deps.transaction((scope) =>
        decidePartnership(scope)(brandId, partnershipId, decision),
      );
    }
    const partnership = await deps.partnerships.findForBrand(
      brandId,
      partnershipId,
    );
    if (!partnership) return { ok: false, error: "not_found" };

    const status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
    await deps.partnerships.setStatus(partnership.id, status);
    return { ok: true, value: undefined };
  };
}
