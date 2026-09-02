import { describe, expect, it } from "vitest";
import {
  buildProfileMediaKey,
  profileMediaContentType,
  validateProfileMediaUrl,
} from "./profile-media";
describe("PROFILE-009 scoped media", () => {
  it("creates owner and kind scoped keys", () =>
    expect(
      buildProfileMediaKey({
        role: "creators",
        ownerId: "c1",
        kind: "creator-work",
        contentType: "image/webp",
        uuid: "00000000-0000-4000-8000-000000000001",
      }),
    ).toBe(
      "profiles/creators/c1/creator-work/00000000-0000-4000-8000-000000000001.webp",
    ));
  it("rejects SVG and cross-owner URLs", () => {
    expect(profileMediaContentType("image/svg+xml").ok).toBe(false);
    expect(
      validateProfileMediaUrl({
        url: "https://media.test/bucket/profiles/creators/c2/creator-work/00000000-0000-4000-8000-000000000001.webp",
        publicEndpoint: "https://media.test",
        bucket: "bucket",
        role: "creators",
        ownerId: "c1",
        kinds: ["creator-work"],
      }),
    ).toBe(false);
  });
});
