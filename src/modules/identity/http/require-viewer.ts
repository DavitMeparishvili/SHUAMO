import type { Viewer } from "../domain/viewer";
import { err, ok, type Result } from "@/src/modules/shared";

export type ViewerRejection = "unauthenticated" | "wrong_capability";

export function requireAdmin(
  viewer: Viewer,
): Result<{ userId: string }, ViewerRejection> {
  if (viewer.kind === "anonymous") return err("unauthenticated");
  if (viewer.kind === "admin" || viewer.isAdmin)
    return ok({ userId: viewer.userId });
  return err("wrong_capability");
}

export function requireBrand(
  viewer: Viewer,
): Result<Extract<Viewer, { kind: "brand" }>, ViewerRejection> {
  if (viewer.kind === "anonymous") return err("unauthenticated");
  if (viewer.kind !== "brand") return err("wrong_capability");
  return ok(viewer);
}

export function requireCreator(
  viewer: Viewer,
): Result<Extract<Viewer, { kind: "creator" }>, ViewerRejection> {
  if (viewer.kind === "anonymous") return err("unauthenticated");
  if (viewer.kind !== "creator") return err("wrong_capability");
  return ok(viewer);
}

// A suspended or access-disabled lead already resolves to anonymous, so the
// flag on an active creator viewer is the whole check.
export function requireTeamLead(
  viewer: Viewer,
): Result<Extract<Viewer, { kind: "creator" }>, ViewerRejection> {
  const creator = requireCreator(viewer);
  if (!creator.ok) return creator;
  if (creator.value.isTeamLead !== true) return err("wrong_capability");
  return creator;
}
