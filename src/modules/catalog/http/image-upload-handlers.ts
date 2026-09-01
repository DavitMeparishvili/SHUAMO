import { z } from "zod";
import {
  createImageUploadUrl,
  type CreateImageUploadUrlDeps,
} from "../application/create-image-upload-url";

const bodySchema = z.object({ contentType: z.string() });

export function createPresignHandler(deps: CreateImageUploadUrlDeps) {
  const run = createImageUploadUrl(deps);
  return async (
    request: Request,
    context: { brandId: string; productId: string },
  ): Promise<Response> => {
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
    const result = await run(context.brandId, context.productId, parsed.data);
    if (!result.ok) {
      return Response.json(
        { error: result.error },
        { status: result.error === "not_found" ? 404 : 422 },
      );
    }
    return Response.json(result.value);
  };
}
