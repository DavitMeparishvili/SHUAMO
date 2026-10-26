import type { Viewer } from "../domain/viewer";
import type { TeamRepository } from "../ports/team-repository";
import { setTeamSettings } from "../application/set-team-settings";

export function createAdminTeamSettingsHandler(dependencies: {
  viewer: () => Promise<Viewer>;
  repository: TeamRepository;
}) {
  const save = setTeamSettings(dependencies.repository);
  return async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> },
  ) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid_input" }, { status: 400 });
    }
    const { id } = await context.params;
    const result = await save(await dependencies.viewer(), {
      ...(body && typeof body === "object" ? body : {}),
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
            : result.error === "invalid_input"
              ? 400
              : 409;
    return Response.json({ error: result.error }, { status });
  };
}
