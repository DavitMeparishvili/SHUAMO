import type { Result } from "@/src/modules/shared";

interface ApplicationPartnerships {
  find(brandId: string, creatorId: string): Promise<{ id: string } | undefined>;
  create(input: {
    brandId: string;
    creatorId: string;
    status: "PENDING" | "APPROVED";
  }): Promise<{ id: string }>;
}

export function applyToBrand(deps: {
  brands: { findById(id: string): Promise<{ id: string } | undefined> };
  partnerships: ApplicationPartnerships;
}) {
  return async (
    creatorId: string,
    brandId: string,
  ): Promise<
    Result<{ partnershipId: string }, "already_exists" | "brand_not_found">
  > => {
    if (!(await deps.brands.findById(brandId))) {
      return { ok: false, error: "brand_not_found" };
    }
    if (await deps.partnerships.find(brandId, creatorId)) {
      return { ok: false, error: "already_exists" };
    }
    const partnership = await deps.partnerships.create({
      brandId,
      creatorId,
      status: "PENDING",
    });
    return { ok: true, value: { partnershipId: partnership.id } };
  };
}

interface InviteScope {
  creators: {
    findById(
      id: string,
    ): Promise<
      { id: string; status: "PENDING" | "APPROVED" | "SUSPENDED" } | undefined
    >;
  };
  partnerships: ApplicationPartnerships;
}

export interface InviteCreatorDeps extends InviteScope {
  transaction?<T>(work: (scope: InviteScope) => Promise<T>): Promise<T>;
}

export function inviteCreator(deps: InviteCreatorDeps) {
  return async (
    brandId: string,
    creatorId: string,
  ): Promise<
    Result<
      { partnershipId: string },
      "already_exists" | "creator_not_found" | "creator_not_approved"
    >
  > => {
    if (deps.transaction) {
      return deps.transaction((scope) =>
        inviteCreator(scope)(brandId, creatorId),
      );
    }
    const creator = await deps.creators.findById(creatorId);
    if (!creator) return { ok: false, error: "creator_not_found" };
    if (creator.status !== "APPROVED") {
      return { ok: false, error: "creator_not_approved" };
    }
    if (await deps.partnerships.find(brandId, creatorId)) {
      return { ok: false, error: "already_exists" };
    }
    const partnership = await deps.partnerships.create({
      brandId,
      creatorId,
      status: "APPROVED",
    });
    return {
      ok: true,
      value: { partnershipId: partnership.id },
    };
  };
}
