import { resolveLink, type DisableReason } from "@/src/modules/partnerships";
import type { Clock } from "@/src/modules/shared";
import { appendClickId } from "../domain/backlink";
import { newClickId, newVisitorId } from "../domain/click-id";
import type { TrackingRandomSource } from "../domain/click-id";
import { DEDUP_WINDOW_MS, decideCreditability } from "../domain/creditability";
import { computeFingerprint } from "../domain/fingerprint";
import type { ClickRepository } from "../ports/click-repository";
import type { LinkLookup } from "../ports/link-lookup";

export interface RecordClickDeps {
  links: LinkLookup;
  clicks: ClickRepository;
  clock: Clock;
  random: TrackingRandomSource;
  secret: string;
}

export interface ClickRequest {
  code: string;
  visitorId: string | undefined;
  ip: string;
  userAgent: string;
}

export type RedirectOutcome =
  | {
      kind: "redirect";
      location: string;
      setVisitorCookie?: string;
    }
  | { kind: "offer-ended"; reason: DisableReason }
  | { kind: "unavailable" };

export function recordClick(deps: RecordClickDeps) {
  return async (request: ClickRequest): Promise<RedirectOutcome> => {
    let snapshot;
    try {
      snapshot = await deps.links.byCode(request.code);
    } catch {
      return { kind: "unavailable" };
    }

    if (snapshot === undefined) {
      return { kind: "offer-ended", reason: "LINK_DISABLED" };
    }

    const resolution = resolveLink(snapshot.state);
    if (!resolution.active) {
      return { kind: "offer-ended", reason: resolution.reason };
    }

    const now = deps.clock.now();
    // Visitor and fingerprint signals deduplicate click analytics only. A
    // conversion later resolves its submitted click ID to this tracking link.
    const fpHash = computeFingerprint({
      ip: request.ip,
      userAgent: request.userAgent,
      secret: deps.secret,
      at: now,
    });
    const clickId = newClickId(deps.random);
    const mintedVisitorId =
      request.visitorId === undefined ? newVisitorId(deps.random) : undefined;

    try {
      const since = new Date(now.getTime() - DEDUP_WINDOW_MS);
      const draft = {
        id: clickId,
        trackingLinkId: snapshot.linkId,
        brandId: snapshot.brandId,
        // A cookie minted on this response did not identify the incoming
        // request, so it cannot describe this click's analytics identity.
        visitorId: request.visitorId,
        fpHash,
        occurredAt: now,
      };

      if (deps.clicks.insertDeduplicated !== undefined) {
        await deps.clicks.insertDeduplicated(
          draft,
          request.visitorId === undefined
            ? { kind: "fingerprint", value: fpHash, since }
            : { kind: "visitor", value: request.visitorId, since },
        );
      } else {
        const priorClickAt =
          request.visitorId === undefined
            ? await deps.clicks.findPriorByFingerprint(
                snapshot.linkId,
                fpHash,
                since,
              )
            : await deps.clicks.findPriorByVisitor(
                snapshot.linkId,
                request.visitorId,
                since,
              );

        await deps.clicks.insert({
          ...draft,
          creditable: decideCreditability({ priorClickAt, now }),
        });
      }
    } catch {
      return { kind: "redirect", location: snapshot.backlinkUrl };
    }

    return {
      kind: "redirect",
      location: appendClickId(snapshot.backlinkUrl, clickId),
      ...(mintedVisitorId === undefined
        ? {}
        : { setVisitorCookie: mintedVisitorId }),
    };
  };
}
