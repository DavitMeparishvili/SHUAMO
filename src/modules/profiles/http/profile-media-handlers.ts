import { z } from "zod";
import { createProfileUploadUrl } from "../application/create-profile-upload-url";
import type { ProfileMediaStorage } from "../ports/profile-media-storage";
const body = z.object({
  kind: z.enum(["brand-logo", "brand-hero", "creator-hero", "creator-work"]),
  contentType: z.string(),
});
export function createProfileMediaHandler(deps: {
  storage: ProfileMediaStorage;
  uuid(): string;
  publicEndpoint: string;
  bucket: string;
}) {
  const run = createProfileUploadUrl(deps);
  return async (
    request: Request,
    context: { role: "brands" | "creators"; ownerId: string },
  ) => {
    let value: unknown;
    try {
      value = await request.json();
    } catch {
      return Response.json({ error: "invalid_body" }, { status: 400 });
    }
    const parsed = body.safeParse(value);
    if (!parsed.success)
      return Response.json({ error: "invalid_body" }, { status: 400 });
    const result = await run(context, parsed.data);
    if (!result.ok)
      return Response.json({ error: result.error }, { status: 422 });
    return Response.json(result.value);
  };
}
