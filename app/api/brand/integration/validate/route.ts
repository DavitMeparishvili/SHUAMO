import { serverEnv } from "@/src/config/env";
import {
  currentViewer,
  requireBrand,
  brandIntegrationIdentity,
} from "@/src/modules/identity";
import {
  createConversionsHandler,
  recordIntegrationRequest,
} from "@/src/modules/conversions";
import {
  intakeConversionForBrand,
  validateConversionForBrand,
} from "@/src/infrastructure/phase-6-services";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = new URL(serverEnv().APP_URL).origin;
  if (
    request.headers.get("origin") !== origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok)
    return Response.json(
      { error: allowed.error },
      { status: allowed.error === "unauthenticated" ? 401 : 403 },
    );
  const brand = await brandIntegrationIdentity(allowed.value.brandId);
  if (!brand || brand.status !== "APPROVED")
    return Response.json({ error: "forbidden" }, { status: 403 });
  const handler = createConversionsHandler({
    authenticate: async () => ({
      ok: true,
      value: { brandId: brand.id, vatRegistered: brand.vatRegistered },
    }),
    intake: intakeConversionForBrand,
    validate: validateConversionForBrand,
    record: recordIntegrationRequest,
    trustedOrigin: origin,
  });
  const headers = new Headers(request.headers);
  headers.set("authorization", "Bearer session");
  // Next wraps the incoming Request. Passing that wrapper to Node's Request
  // constructor can fail its private-state checks in a production build.
  const forwarded = {
    method: "POST",
    headers,
    body: request.body,
    duplex: "half" as const,
  };
  return handler(new Request(request.url, forwarded));
}
