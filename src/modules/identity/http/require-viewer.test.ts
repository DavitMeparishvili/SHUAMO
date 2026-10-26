import { describe, expect, it } from "vitest";
import type { Viewer } from "../domain/viewer";
import {
  requireBrand,
  requireCreator,
  requireTeamLead,
} from "./require-viewer";

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

  it("admits only a creator flagged as team lead", () => {
    const creator = viewers[2] as Extract<Viewer, { kind: "creator" }>;
    const lead: Viewer = { ...creator, isTeamLead: true };
    expect(requireTeamLead({ kind: "anonymous" })).toEqual({
      ok: false,
      error: "unauthenticated",
    });
    expect(requireTeamLead(creator)).toEqual({
      ok: false,
      error: "wrong_capability",
    });
    expect(requireTeamLead(viewers[1]!)).toEqual({
      ok: false,
      error: "wrong_capability",
    });
    expect(requireTeamLead(lead)).toEqual({ ok: true, value: lead });
  });
});
