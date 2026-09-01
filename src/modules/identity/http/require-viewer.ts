import type { Viewer } from "../domain/viewer";
import { err, ok, type Result } from "@/src/modules/shared";

export type ViewerRejection = "unauthenticated" | "wrong_capability";

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
