export {
  resolveLink,
  type DisableReason,
  type LinkResolution,
  type LinkState,
} from "./domain/disable-chain";
export {
  generateLinkCode,
  isLinkCode,
  type LinkCodeRandomSource,
} from "./domain/link-code";
export { applyToBrand, inviteCreator } from "./application/apply-to-brand";
export { decidePartnership } from "./application/decide-partnership";
export {
  createProductLink,
  type ProductLinkCreated,
  type ProductLinkError,
} from "./application/create-product-link";
export { ActiveLinkExistsError } from "./ports/link-repository";
export { setLinkStatus } from "./application/set-link-status";
export {
  createPrismaPartnershipRepository,
  listBrandsForCreator,
  listApprovedCreatorsForBrand,
  listPartnershipsForBrand,
  prismaBrandLookup,
  prismaCreatorLookup,
  prismaPartnershipRepository,
} from "./infrastructure/prisma-partnership-repository";
export {
  createPrismaLinkRepository,
  listResolvedLinksForBrand,
  listResolvedLinksForCreator,
  prismaLinkRepository,
} from "./infrastructure/prisma-link-repository";
export { CreatorBrandList, PartnershipQueue } from "./ui/partnership-queue";
export { BrandLinkList, LinkList } from "./ui/link-list";
export {
  createApplyHandler,
  createDecisionHandler,
} from "./http/partnership-handlers";
