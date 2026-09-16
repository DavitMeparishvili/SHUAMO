import type { Viewer } from "../domain/viewer";
import type { AdminAccountApprovalRepository } from "../ports/account-repository";
import { setAdminAccountApproval } from "../application/set-account-approval";

export function createAdminAccountStatusHandler(dependencies: {
  viewer: () => Promise<Viewer>;
  repository: AdminAccountApprovalRepository;
}) {
  const changeStatus = setAdminAccountApproval(dependencies.repository);
  return async function PATCH(
    request: Request,
    context: { params: Promise<{ kind: string; id: string }> },
  ) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid_input" }, { status: 400 });
    }
    const { kind, id } = await context.params;
    const result = await changeStatus(await dependencies.viewer(), {
      ...(body && typeof body === "object" ? body : {}),
      kind,
      id,
    });
    if (result.ok)
      return Response.json(result.value, {
        headers: { "Cache-Control": "no-store" },
      });
    const status =
      result.error === "unauthenticated"
        ? 401
        : result.error === "wrong_capability"
          ? 403
          : result.error === "not_found"
            ? 404
            : 400;
    return Response.json({ error: result.error }, { status });
  };
}
