import { describe, expect, it } from "vitest";
import {
  readVisitorCookie,
  serializeVisitorCookie,
  VISITOR_COOKIE,
} from "./visitor-cookie";

const ID = "11111111-1111-4111-8111-111111111111";

describe("visitor cookie", () => {
  it("uses the required name, duration and security attributes", () => {
    expect(VISITOR_COOKIE).toEqual({
      name: "xu_vid",
      maxAgeSeconds: 2_592_000,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
    expect(serializeVisitorCookie(ID)).toBe(
      `xu_vid=${ID}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure`,
    );
  });

  it("reads a valid visitor id among unrelated cookies", () => {
    expect(
      readVisitorCookie(
        new Headers({ cookie: `session=a; xu_vid=${ID}; theme=b` }),
      ),
    ).toBe(ID);
  });

  it("treats a forged non-UUID value as no cookie", () => {
    expect(
      readVisitorCookie(new Headers({ cookie: "xu_vid=not-a-uuid" })),
    ).toBeUndefined();
  });

  it("treats malformed percent encoding as absent instead of throwing", () => {
    expect(
      readVisitorCookie(new Headers({ cookie: "xu_vid=%E0%A4%A" })),
    ).toBeUndefined();
  });
});
