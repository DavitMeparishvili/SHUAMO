import { describe, expect, it } from "vitest";
import { navDestinationsFor } from "./nav-model";

describe("navDestinationsFor", () => {
  it("offers anonymous public discovery before sign-in", () => {
    const destinations = navDestinationsFor({ kind: "anonymous" }, "ka");
    expect(destinations.map((destination) => destination.href)).toEqual([
      "/ka/products",
      "/ka/creators",
      "/ka/brands",
      "/ka/sign-in",
    ]);
  });

  it("offers product discovery to every viewer kind", () => {
    const viewers = [
      { kind: "anonymous" } as const,
      {
        kind: "brand" as const,
        userId: "u1",
        brandId: "b1",
        brandName: "Aromashop",
        isAdmin: false,
      },
      {
        kind: "creator" as const,
        userId: "u2",
        creatorId: "c1",
        displayName: "Nino",
        isAdmin: false,
      },
      { kind: "admin" as const, userId: "u3" },
    ];

    for (const viewer of viewers) {
      expect(
        navDestinationsFor(viewer, "en").some(
          (destination) => destination.href === "/en/products",
        ),
      ).toBe(true);
    }
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
