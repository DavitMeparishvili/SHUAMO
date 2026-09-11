import type { ConversionPayload } from "../domain/payload";
import { parseConversionJson } from "../application/parse-payload";
import type { IntakeResult } from "../application/intake-conversion";
import type { ValidationResult } from "../application/validate-conversion";
import type { IntegrationRequest } from "../ports/integration-request";

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
  readonly validate?: (
    brand: { id: string; vatRegistered: boolean },
    payload: ConversionPayload,
  ) => Promise<ValidationResult>;
  readonly record?: (request: IntegrationRequest) => Promise<void>;
  readonly trustedOrigin?: string;
}) {
  return async (request: Request): Promise<Response> => {
    const startedAt = performance.now();
    const requestId = crypto.randomUUID();
    const context: { brandId?: string } = {};
    const headers = new Headers({
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
    });
    const respond = async (
      body: unknown,
      status: number,
      outcome = "invalid_payload",
    ) => {
      if (context.brandId && dependencies.record) {
        try {
          await dependencies.record({
            id: requestId,
            brandId: context.brandId,
            mode: dependencies.validate ? "validation" : "live",
            status,
            outcome,
          });
        } catch {
          // A logging failure must never turn a committed sale into an error.
          dependencies.log?.({
            event: "integration_request_log_failed",
            requestId,
          });
        }
      }
      headers.set(
        "Server-Timing",
        `total;dur=${(performance.now() - startedAt).toFixed(2)}`,
      );
      return Response.json(body, { status, headers });
    };

    if (
      request.headers.has("origin") &&
      request.headers.get("origin") !== dependencies.trustedOrigin
    ) {
      dependencies.log?.({
        event: "probable_leaked_secret",
        path: new URL(request.url).pathname,
      });
      return respond({ error: "unauthorized" }, 401);
    }

    const key = bearerToken(request);
    if (key === undefined) return respond({ error: "unauthorized" }, 401);
    let authenticated: AuthenticationResult;
    try {
      authenticated = await dependencies.authenticate(key);
    } catch {
      return respond(
        { error: "temporarily_unavailable" },
        503,
        "temporarily_unavailable",
      );
    }
    if (!authenticated.ok) {
      return respond({ error: "unauthorized" }, 401);
    }
    const brandId = authenticated.value.brandId;
    context.brandId = brandId;

    // Bound the streamed body, including requests without Content-Length.
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      if (reader)
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 262144) {
            await reader.cancel();
            return respond(
              { error: "payload_too_large" },
              413,
              "payload_too_large",
            );
          }
          chunks.push(value);
        }
    } catch {
      return respond({ error: "malformed_json" }, 400, "malformed_json");
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const payload = parseConversionJson(new TextDecoder().decode(bytes));
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
        payload.error.kind === "malformed"
          ? "malformed_json"
          : "invalid_payload",
      );
    }

    if (dependencies.validate) {
      try {
        const validation = await dependencies.validate(
          { id: brandId, vatRegistered: authenticated.value.vatRegistered },
          payload.value,
        );
        return respond(validation, 200, validation.outcome);
      } catch {
        return respond(
          { error: "temporarily_unavailable" },
          503,
          "temporarily_unavailable",
        );
      }
    }
    let result: IntakeResult;
    try {
      result = await dependencies.intake(
        {
          id: authenticated.value.brandId,
          vatRegistered: authenticated.value.vatRegistered,
        },
        payload.value,
      );
    } catch {
      return respond(
        { error: "temporarily_unavailable" },
        503,
        "temporarily_unavailable",
      );
    }
    if (result.kind === "order_conflict") {
      return respond({ error: "order_conflict" }, 409, "order_conflict");
    }
    if (result.kind === "click_conflict") {
      dependencies.log?.({
        event: "attribution_conflict",
        reason: "click_already_attributed",
        path: new URL(request.url).pathname,
      });
      return respond(
        { error: "click_already_attributed" },
        409,
        "click_already_attributed",
      );
    }
    if (result.kind === "timestamp_invalid") {
      return respond(
        { error: "timestamp_out_of_range" },
        422,
        "timestamp_out_of_range",
      );
    }
    return respond(result.conversion, 200, result.kind);
  };
}
