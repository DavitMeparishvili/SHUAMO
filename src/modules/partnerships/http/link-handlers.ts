import { z } from "zod";
import type { Result } from "@/src/modules/shared";
import type {
  ProductLinkCreated,
  ProductLinkError,
} from "../application/create-product-link";

const bodySchema = z.object({ productId: z.string().min(1) }).strict();

export function createProductLinkHandler(
  create: (
    creatorId: string,
    productId: string,
  ) => Promise<Result<ProductLinkCreated, ProductLinkError>>,
) {
  return async (creatorId: string, request: Request): Promise<Response> => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid_body" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "invalid_body" }, { status: 400 });
    }
    const result = await create(creatorId, parsed.data.productId);
    if (result.ok) return Response.json(result.value, { status: 201 });
    const status =
      result.error === "product_not_found"
        ? 404
        : result.error === "partnership_not_approved"
          ? 403
          : 409;
    return Response.json({ error: result.error }, { status });
  };
}
