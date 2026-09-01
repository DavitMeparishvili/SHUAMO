import { serverEnv } from "@/src/config/env";
import { systemClock } from "@/src/modules/shared";
import { recordClick } from "../application/record-click";
import type { RedirectOutcome } from "../application/record-click";
import { nodeCryptoRandom } from "../domain/click-id";
import {
  readVisitorCookie,
  serializeVisitorCookie,
} from "../domain/visitor-cookie";
import { resolveClientIp } from "../infrastructure/client-ip";
import { prismaClickRepository } from "../infrastructure/prisma-click-repository";
import { prismaLinkLookup } from "../infrastructure/prisma-link-lookup";

type RedirectRecorder = (input: {
  code: string;
  visitorId: string | undefined;
  ip: string;
  userAgent: string;
}) => Promise<RedirectOutcome>;

function localeFrom(headers: Headers): "ka" | "en" {
  const accepted = headers.get("accept-language")?.toLowerCase() ?? "";
  let best: { locale: "ka" | "en"; quality: number } | undefined;

  for (const item of accepted.split(",")) {
    const [range = "", ...parameters] = item.trim().split(";");
    const primary = range.split("-", 1)[0];
    if (primary !== "ka" && primary !== "en") continue;

    const qualityParameter = parameters.find((parameter) =>
      parameter.trim().startsWith("q="),
    );
    const quality =
      qualityParameter === undefined
        ? 1
        : Number(qualityParameter.trim().slice(2));
    if (!Number.isFinite(quality) || quality <= 0 || quality > 1) continue;
    if (best === undefined || quality > best.quality) {
      best = { locale: primary, quality };
    }
  }
  return best?.locale ?? "ka";
}

function defaultRecorder(): RedirectRecorder {
  return recordClick({
    links: prismaLinkLookup,
    clicks: prismaClickRepository,
    clock: systemClock,
    random: nodeCryptoRandom,
    secret: serverEnv().FINGERPRINT_SECRET,
  });
}

export function createRedirectHandler(
  dependencies: { record?: RedirectRecorder } = {},
) {
  return async (
    request: Request,
    context: { params: Promise<{ code: string }> },
  ): Promise<Response> => {
    const startedAt = performance.now();
    const { code } = await context.params;
    const record = dependencies.record ?? defaultRecorder();
    const outcome = await record({
      code,
      visitorId: readVisitorCookie(request.headers),
      ip: resolveClientIp(request.headers),
      userAgent: request.headers.get("user-agent") ?? "unknown",
    });

    const headers = new Headers({ "Cache-Control": "no-store" });
    headers.set(
      "Server-Timing",
      `total;dur=${(performance.now() - startedAt).toFixed(2)}`,
    );

    if (outcome.kind === "unavailable") {
      return new Response(null, { status: 503, headers });
    }

    if (outcome.kind === "offer-ended") {
      const query = new URLSearchParams({ reason: outcome.reason });
      headers.set(
        "Location",
        `/${localeFrom(request.headers)}/offer-ended?${query.toString()}`,
      );
      return new Response(null, { status: 302, headers });
    }

    headers.set("Location", outcome.location);
    if (outcome.setVisitorCookie !== undefined) {
      headers.set(
        "Set-Cookie",
        serializeVisitorCookie(outcome.setVisitorCookie),
      );
    }
    return new Response(null, { status: 302, headers });
  };
}
