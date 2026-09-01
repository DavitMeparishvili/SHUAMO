import { describe, expect, it } from "vitest";
import { navDestinationsFor } from "./nav-model";

describe("navDestinationsFor", () => {
  it("offers an anonymous viewer nothing but sign-in", () => {
    const destinations = navDestinationsFor({ kind: "anonymous" }, "ka");
    expect(destinations.map((destination) => destination.href)).toEqual([
      "/ka/sign-in",
    ]);
  });

  it("never offers a creator a brand destination", () => {
    const destinations = navDestinationsFor(
      {
        kind: "creator",
        userId: "u1",
        creatorId: "c1",
        displayName: "Nino",
        isAdmin: false,
      },
      "en",
    );
    expect(
      destinations.every(
        (destination) => !destination.href.includes("/brand/"),
      ),
    ).toBe(true);
  });

  it("never offers a brand a creator destination", () => {
    const destinations = navDestinationsFor(
      {
        kind: "brand",
        userId: "u1",
        brandId: "b1",
        brandName: "Aromashop",
        isAdmin: false,
      },
      "en",
    );
    expect(
      destinations.every(
        (destination) => !destination.href.includes("/creator/"),
      ),
    ).toBe(true);
  });

  it("prefixes every destination with the active locale", () => {
    for (const locale of ["ka", "en"] as const) {
      const destinations = navDestinationsFor(
        { kind: "admin", userId: "u1" },
        locale,
      );
      expect(
        destinations.every((destination) =>
          destination.href.startsWith(`/${locale}/`),
        ),
      ).toBe(true);
    }
  });
});
