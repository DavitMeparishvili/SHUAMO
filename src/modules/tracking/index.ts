export { recordClick } from "./application/record-click";
export type {
  ClickRequest,
  RecordClickDeps,
  RedirectOutcome,
} from "./application/record-click";
export { appendClickId } from "./domain/backlink";
export { newClickId, newVisitorId, nodeCryptoRandom } from "./domain/click-id";
export type { TrackingRandomSource } from "./domain/click-id";
export { DEDUP_WINDOW_MS, decideCreditability } from "./domain/creditability";
export { computeFingerprint, dailySalt } from "./domain/fingerprint";
export {
  readVisitorCookie,
  serializeVisitorCookie,
  VISITOR_COOKIE,
} from "./domain/visitor-cookie";
export { createRedirectHandler } from "./http/redirect-handler";
export { resolveClientIp } from "./infrastructure/client-ip";
export { prismaClickRepository } from "./infrastructure/prisma-click-repository";
export { prismaLinkLookup } from "./infrastructure/prisma-link-lookup";
export type {
  ClickDraft,
  ClickRepository,
  ClickWrite,
  DedupSignal,
} from "./ports/click-repository";
export type { LinkLookup, LinkSnapshot } from "./ports/link-lookup";
export { OfferEnded } from "./ui/offer-ended";
