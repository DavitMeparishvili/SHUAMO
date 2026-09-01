import { z } from "zod";
import { archiveProduct } from "../application/archive-product";
import {
  createProduct,
  type CreateProductDeps,
} from "../application/create-product";
import { updateProduct } from "../application/update-product";
import type { ProductRepository } from "../ports/product-repository";
import type { ProductImageUrlError } from "../domain/image-upload";
import type { Result } from "@/src/modules/shared";
import { parseProductRate } from "../domain/product-rate";

export const productBodySchema = z
  .object({
    sku: z.string(),
    title: z.string(),
    description: z.string().optional(),
    priceGel: z.string(),
    imageUrls: z.array(z.string()).optional(),
    backlinkUrl: z.string(),
    commissionType: z.enum(["PERCENT", "FIXED"]),
    commissionValue: z.string(),
  })
  .superRefine((input, context) => {
    const rate = parseProductRate({
      type: input.commissionType,
      value: input.commissionValue,
    });
    if (!rate.ok) {
      context.addIssue({
        code: "custom",
        path: ["commissionValue"],
        message: rate.error,
      });
    }
  });

async function parseBody(request: Request) {
  try {
    return productBodySchema.safeParse(await request.json());
  } catch {
    return productBodySchema.safeParse(undefined);
  }
}

export function createProductPostHandler(deps: CreateProductDeps) {
  const run = createProduct(deps);
  return async (request: Request, brandId: string): Promise<Response> => {
    const parsed = await parseBody(request);
    if (!parsed.success)
      return Response.json({ error: "invalid_body" }, { status: 400 });
    const result = await run(brandId, parsed.data);
    return result.ok
      ? Response.json(result.value, { status: 201 })
      : Response.json(
          { error: result.error },
          { status: result.error === "duplicate_sku" ? 409 : 422 },
        );
  };
}

export function createProductPatchHandler(deps: {
  products: Pick<ProductRepository, "findOwned" | "findBrandSku" | "update">;
  validateImageUrls(input: {
    brandId: string;
    productId: string;
    values: readonly string[];
  }): Result<string[], ProductImageUrlError>;
}) {
  const run = updateProduct(deps);
  return async (
    request: Request,
    context: { brandId: string; productId: string },
  ): Promise<Response> => {
    const parsed = await parseBody(request);
    if (!parsed.success)
      return Response.json({ error: "invalid_body" }, { status: 400 });
    const result = await run(context.brandId, context.productId, parsed.data);
    if (result.ok) return Response.json(result.value);
    const status =
      result.error === "not_found"
        ? 404
        : result.error === "duplicate_sku"
          ? 409
          : 422;
    return Response.json({ error: result.error }, { status });
  };
}

export function createProductArchiveHandler(deps: {
  products: Pick<ProductRepository, "findOwned" | "setStatus">;
}) {
  const run = archiveProduct(deps);
  return async (brandId: string, productId: string): Promise<Response> => {
    const result = await run(brandId, productId);
    return result.ok
      ? new Response(null, { status: 204 })
      : Response.json({ error: result.error }, { status: 404 });
  };
}
