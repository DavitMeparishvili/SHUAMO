// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CreatorProfile } from "./creator-profile";

const copy = {
  preview: "Preview",
  approved: "Approved",
  ledger: "Ledger",
  supplied: "Supplied",
  disclosure: "Disclosure",
  work: "Work",
  leave: "Leaves Xurjin",
  fallback: "From {locale}",
  source: "Source",
  languages: "Languages",
  contentFormats: "Content formats",
  heroAlt: "Portrait of {name}",
  workAlt: "Work: {title}",
  socialLabels: { instagram: "Instagram", website: "Website" },
};
const profile = {
  slug: "nino",
  taglineKa: "",
  taglineEn: "Everyday style",
  descriptionKa: "",
  descriptionEn: "Long description of Nino",
  locationKa: "",
  locationEn: "Tbilisi",
  heroImageUrl: "/hero",
  categories: ["Fashion"],
  languages: ["Georgian"],
  contentFormats: ["Reels"],
  socialLinks: [
    { platform: "instagram", url: "https://instagram.com/nino" },
    { platform: "website", url: "https://nino.ge" },
  ],
  featuredWork: [],
  creator: { displayName: "Nino" },
};
const shop = [
  {
    productId: "p1",
    code: "CODE1",
    title: "Silk scarf",
    brandName: "Aroma",
    imageUrl: "/scarf.webp",
  },
];

function precedes(a: Element, b: Element) {
  return Boolean(
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
}

describe("creator profile layout", () => {
  it("orders header, socials, shop, featured work, action and disclosure", () => {
    const { container } = render(
      <CreatorProfile
        profile={{
          ...profile,
          featuredWork: [
            {
              title: { en: "Night walks", ka: "" },
              url: "https://example.test/work",
              imageUrl: "/work",
            },
          ],
        }}
        locale="en"
        copy={copy}
        shop={shop}
        action={<button type="button">Sign in to connect</button>}
      />,
    );
    const sequence = [
      screen.getByRole("heading", { level: 1, name: "Nino" }),
      screen.getByText("Everyday style"),
      screen.getByText("Long description of Nino"),
      screen.getByRole("list", { name: "Social profiles" }),
      screen.getByRole("heading", { level: 2, name: /Shop my picks/ }),
      screen.getByRole("heading", { level: 2, name: "Work" }),
      screen.getByRole("button", { name: "Sign in to connect" }),
      screen.getByText("Disclosure"),
    ];
    sequence
      .slice(1)
      .forEach((element, index) =>
        expect(precedes(sequence[index]!, element)).toBe(true),
      );
    const intro = container.querySelector(".creator-intro")!;
    expect(intro.nextElementSibling).toHaveClass("creator-shop");
    expect(container.querySelector(".creator-about")).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Social profiles" }),
    ).toBeNull();
  });

  it("drops empty sections and keeps the same header without a shop", () => {
    const { container } = render(
      <CreatorProfile
        profile={{
          ...profile,
          descriptionEn: "",
          categories: [],
          languages: [],
          contentFormats: [],
          socialLinks: [],
        }}
        locale="en"
        copy={copy}
      />,
    );
    expect(container.querySelector(".creator-shop")).toBeNull();
    expect(container.querySelector(".creator-socials")).toBeNull();
    expect(container.querySelector(".creator-facts")).toBeNull();
    expect(container.querySelector(".creator-categories")).toBeNull();
    expect(container.querySelector("#featured-work")).toBeNull();
    const intro = container.querySelector(".creator-intro")!;
    expect(within(intro as HTMLElement).getByText("Everyday style"));
    expect(intro.nextElementSibling).toHaveClass("profile-disclosure");
  });

  it("shows only the languages or formats that are set", () => {
    render(
      <CreatorProfile
        profile={{ ...profile, contentFormats: [] }}
        locale="en"
        copy={copy}
      />,
    );
    expect(screen.getByText("Languages")).toBeInTheDocument();
    expect(screen.queryByText("Content formats")).toBeNull();
  });

  it("puts the owner's empty-shop callout where the shop would be", () => {
    const { container } = render(
      <CreatorProfile
        profile={profile}
        locale="en"
        copy={copy}
        shopCallout={<section className="creator-shop-callout">Add</section>}
      />,
    );
    const intro = container.querySelector(".creator-intro")!;
    expect(intro.nextElementSibling).toHaveClass("creator-shop-callout");
  });

  it("social links are labelled buttons with accessible names", () => {
    const { container } = render(
      <CreatorProfile profile={profile} locale="en" copy={copy} shop={shop} />,
    );
    const intro = container.querySelector(".creator-intro") as HTMLElement;
    expect(
      within(intro).getByRole("link", { name: /^Instagram/ }),
    ).toHaveAttribute("href", "https://instagram.com/nino");
    expect(
      within(intro).getByRole("link", { name: /^Website/ }),
    ).toBeInTheDocument();
    expect(within(intro).getByText("Instagram")).toBeVisible();
  });
});
