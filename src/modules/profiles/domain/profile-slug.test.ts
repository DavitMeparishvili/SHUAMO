import { describe, expect, it } from "vitest";
import { isProfileSlug, normalizeProfileSlug } from "./profile-slug";
describe("PROFILE-007 profile slugs", () => {
  it("normalizes lowercase ASCII words", () =>
    expect(normalizeProfileSlug("  Nino Beridze ")).toBe("nino-beridze"));
  it("rejects reserved and malformed slugs", () => {
    expect(isProfileSlug("profile")).toBe(false);
    expect(isProfileSlug("ab")).toBe(false);
    expect(isProfileSlug("nino--x")).toBe(false);
  });
});
