import { z } from "zod";
import type { Result } from "@/src/modules/shared";

const decisionSchema = z.object({ decision: z.enum(["APPROVE", "REJECT"]) });

export function createDecisionHandler(
  decide: (
    brandId: string,
    partnershipId: string,
    decision: "APPROVE" | "REJECT",
  ) => Promise<Result<void, "not_found">>,
) {
  return async (
    request: Request,
    context: { brandId: string; partnershipId: string },
  ): Promise<Response> => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid_body" }, { status: 400 });
    }
    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "invalid_body" }, { status: 400 });
    }
    const result = await decide(
      context.brandId,
      context.partnershipId,
      parsed.data.decision,
    );
    return result.ok
      ? new Response(null, { status: 204 })
      : Response.json({ error: result.error }, { status: 404 });
  };
}

export function createApplyHandler(
  apply: (
    creatorId: string,
    brandId: string,
  ) => Promise<
    Result<{ partnershipId: string }, "already_exists" | "brand_not_found">
  >,
) {
  return async (creatorId: string, brandId: string): Promise<Response> => {
    const result = await apply(creatorId, brandId);
    if (result.ok) return Response.json(result.value, { status: 201 });
    return Response.json(
      { error: result.error },
      { status: result.error === "already_exists" ? 409 : 404 },
    );
  };
}
