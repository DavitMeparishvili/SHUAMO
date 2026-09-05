import type { Viewer } from "@/src/modules/identity";
import { requireBrand } from "@/src/modules/identity";
import type {
  ConversionStatus,
  OrderAction,
} from "../domain/order-transitions";

type DecideResult =
  | { readonly ok: true; readonly value: { readonly status: ConversionStatus } }
  | {
      readonly ok: false;
      readonly error: "not_found" | "illegal_transition";
    };

export function createOrderPatchHandler(dependencies: {
  readonly currentViewer: () => Promise<Viewer>;
  readonly decide: (
    brandId: string,
    actorId: string,
    conversionId: string,
    action: OrderAction,
  ) => Promise<DecideResult>;
}) {
  return async (
    request: Request,
    context: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    const allowed = requireBrand(await dependencies.currentViewer());
    if (!allowed.ok) {
      return Response.json(
        { error: allowed.error },
        { status: allowed.error === "unauthenticated" ? 401 : 403 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid_body" }, { status: 400 });
    }
    const action =
      typeof body === "object" &&
      body !== null &&
      "action" in body &&
      body.action === "CANCEL"
        ? body.action
        : undefined;
    if (action === undefined) {
      return Response.json({ error: "invalid_body" }, { status: 400 });
    }

    const { id } = await context.params;
    const result = await dependencies.decide(
      allowed.value.brandId,
      allowed.value.userId,
      id,
      action,
    );
    if (!result.ok) {
      return Response.json(
        { error: result.error },
        { status: result.error === "not_found" ? 404 : 409 },
      );
    }
    return Response.json(result.value, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  };
}
