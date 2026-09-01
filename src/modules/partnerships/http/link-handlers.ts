import { z } from "zod";
import type { Result } from "@/src/modules/shared";
import type {
  ProductLinkCreated,
  ProductLinkError,
} from "../application/create-product-link";
import type { ProductLinkAcceptance } from "../ports/link-repository";

const bodySchema = z
  .object({
    productId: z.string().min(1).max(64),
    commissionType: z.enum(["PERCENT", "FIXED"]),
    commissionValue: z
      .string()
      .min(1)
      .max(16)
      .regex(/^\d+(?:\.\d{1,4})?$/),
  })
  .strict();

export function parseProductLinkAcceptance(
  input: unknown,
): ProductLinkAcceptance | undefined {
  const parsed = bodySchema.safeParse(input);
  return parsed.success ? parsed.data : undefined;
}

export function createProductLinkHandler(
  create: (
    creatorId: string,
    acceptance: ProductLinkAcceptance,
  ) => Promise<Result<ProductLinkCreated, ProductLinkError>>,
) {
  return async (creatorId: string, request: Request): Promise<Response> => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid_body" }, { status: 400 });
    }
    const acceptance = parseProductLinkAcceptance(body);
    if (acceptance === undefined) {
      return Response.json({ error: "invalid_body" }, { status: 400 });
    }
    const result = await create(creatorId, acceptance);
    if (result.ok) return Response.json(result.value, { status: 201 });
    const status =
      result.error === "product_not_found"
        ? 404
        : result.error === "brand_not_approved" ||
            result.error === "creator_not_approved" ||
            result.error === "partnership_not_approved"
          ? 403
          : 409;
    return Response.json({ error: result.error }, { status });
  };
}
