import type { ConversionPayload } from "../domain/payload";
import { parseConversionJson } from "../application/parse-payload";
import type { IntakeResult } from "../application/intake-conversion";

type AuthenticationResult =
  | {
      readonly ok: true;
      readonly value: {
        readonly brandId: string;
        readonly vatRegistered: boolean;
      };
    }
  | {
      readonly ok: false;
      readonly error: "unknown_key" | "brand_not_approved";
    };

function bearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  if (header === null) return undefined;
  const match = /^Bearer ([^\s]+)$/.exec(header);
  return match?.[1];
}

export function createConversionsHandler(dependencies: {
  readonly authenticate: (key: string) => Promise<AuthenticationResult>;
  readonly intake: (
    brand: { readonly id: string; readonly vatRegistered: boolean },
    payload: ConversionPayload,
  ) => Promise<IntakeResult>;
  readonly log?: (event: Record<string, unknown>) => void;
}) {
  return async (request: Request): Promise<Response> => {
    const startedAt = performance.now();
    const headers = new Headers({ "Cache-Control": "no-store" });
    const respond = (body: unknown, status: number) => {
      headers.set(
        "Server-Timing",
        `total;dur=${(performance.now() - startedAt).toFixed(2)}`,
      );
      return Response.json(body, { status, headers });
    };

    if (request.headers.has("origin")) {
      dependencies.log?.({
        event: "probable_leaked_secret",
        path: new URL(request.url).pathname,
      });
      return respond({ error: "unauthorized" }, 401);
    }

    const key = bearerToken(request);
    if (key === undefined) return respond({ error: "unauthorized" }, 401);
    const authenticated = await dependencies.authenticate(key);
    if (!authenticated.ok) {
      return respond({ error: "unauthorized" }, 401);
    }

    const payload = parseConversionJson(await request.text());
    if (!payload.ok) {
      return respond(
        {
          error:
            payload.error.kind === "malformed"
              ? "malformed_json"
              : "invalid_payload",
          ...(payload.error.kind === "invalid"
            ? { issues: payload.error.issues }
            : {}),
        },
        payload.error.kind === "malformed" ? 400 : 422,
      );
    }

    const result = await dependencies.intake(
      {
        id: authenticated.value.brandId,
        vatRegistered: authenticated.value.vatRegistered,
      },
      payload.value,
    );
    if (result.kind === "conflict") {
      return respond({ error: "order_conflict" }, 409);
    }
    if (result.kind === "timestamp_invalid") {
      return respond({ error: "timestamp_out_of_range" }, 422);
    }
    return respond(result.conversion, 200);
  };
}
