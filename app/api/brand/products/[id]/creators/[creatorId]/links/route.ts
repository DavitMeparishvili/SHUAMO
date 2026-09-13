import { currentViewer, requireBrand } from "@/src/modules/identity";
import { brandProductCreators, productWorkspaceQuery } from "@/src/modules/conversions";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; creatorId: string }> }) {
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const { id, creatorId } = await params;
  const paramsQuery = new URL(request.url).searchParams;
  const query = productWorkspaceQuery(Object.fromEntries(paramsQuery));
  const page = Math.min(100000, Math.max(1, Math.floor(Number(paramsQuery.get("linkPage")) || 1)));
  const data = await brandProductCreators(allowed.value.brandId, id, query, new Date(), { creatorId, page });
  if (!data || !data.groups[0]) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ group: data.groups[0], metricsUnavailable: data.metricsUnavailable }, { headers: { "Cache-Control": "private, no-store" } });
}
