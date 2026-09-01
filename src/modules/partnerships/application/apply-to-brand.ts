import type { Result } from "@/src/modules/shared";
import { generateLinkCode } from "../domain/link-code";
import { linksToMint } from "../domain/link-minting";

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
  products: {
    listActiveForBrand(
      brandId: string,
    ): Promise<{ id: string; status: "ACTIVE" | "ARCHIVED" }[]>;
  };
  links: {
    listForCreator(
      creatorId: string,
    ): Promise<{ productId: string; creatorId: string }[]>;
    createMany(
      pairs: readonly { productId: string; creatorId: string; code: string }[],
    ): Promise<void>;
  };
  random: { bytes(count: number): Uint8Array };
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
      { partnershipId: string; mintedLinks: number },
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
    const products = await deps.products.listActiveForBrand(brandId);
    const existing = await deps.links.listForCreator(creatorId);
    const pairs = linksToMint({
      products,
      creators: [{ id: creatorId, partnershipStatus: "APPROVED" }],
      existing,
    });
    await deps.links.createMany(
      pairs.map((pair) => ({ ...pair, code: generateLinkCode(deps.random) })),
    );
    return {
      ok: true,
      value: { partnershipId: partnership.id, mintedLinks: pairs.length },
    };
  };
}
