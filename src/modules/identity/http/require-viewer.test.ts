import { describe, expect, it } from "vitest";
import type { Viewer } from "../domain/viewer";
import { requireBrand, requireCreator } from "./require-viewer";

const viewers: Viewer[] = [
  { kind: "anonymous" },
  {
    kind: "brand",
    userId: "u",
    brandId: "b",
    brandName: "Brand",
    isAdmin: false,
  },
  {
    kind: "creator",
    userId: "u",
    creatorId: "c",
    displayName: "Creator",
    isAdmin: false,
  },
  { kind: "admin", userId: "u" },
];

describe("viewer guards", () => {
  it.each(viewers)("guards brand capability for $kind", (viewer) => {
    expect(requireBrand(viewer).ok).toBe(viewer.kind === "brand");
  });
  it.each(viewers)("guards creator capability for $kind", (viewer) => {
    expect(requireCreator(viewer).ok).toBe(viewer.kind === "creator");
  });
});
