import type { Viewer } from "../domain/viewer";
import { requireBrand } from "./require-viewer";

type Generate = (
  brandId: string,
) => Promise<
  | { ok: true; value: { plaintext: string; prefix: string } }
  | { ok: false; error: "not_found" }
>;

export function createBrandKeyPostHandler(dependencies: {
  currentViewer: () => Promise<Viewer>;
  generate: Generate;
}) {
  return async (): Promise<Response> => {
    const allowed = requireBrand(await dependencies.currentViewer());
    if (!allowed.ok) {
      return Response.json(
        { error: allowed.error },
        { status: allowed.error === "unauthenticated" ? 401 : 403 },
      );
    }
    const result = await dependencies.generate(allowed.value.brandId);
    if (!result.ok)
      return Response.json({ error: result.error }, { status: 404 });
    return Response.json(result.value, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  };
}
