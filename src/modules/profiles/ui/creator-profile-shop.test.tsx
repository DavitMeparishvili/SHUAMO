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

describe("shop-first creator profile", () => {
  it("keeps today's layout without a shop", () => {
    const { container } = render(
      <CreatorProfile profile={profile} locale="en" copy={copy} />,
    );
    expect(container.querySelector(".creator-shop")).toBeNull();
    expect(
      container.querySelector(".creator-intro .creator-bio"),
    ).not.toBeNull();
    expect(container.querySelector(".creator-intro.compact")).toBeNull();
  });

  it("puts the shop directly after a compact header", () => {
    const { container } = render(
      <CreatorProfile profile={profile} locale="en" copy={copy} shop={shop} />,
    );
    const h1 = screen.getByRole("heading", { level: 1, name: "Nino" });
    const shopHeading = screen.getByRole("heading", { name: /Shop my picks/ });
    const description = screen.getByText("Long description of Nino");
    const socials = container.querySelector(".creator-socials")!;
    expect(precedes(h1, shopHeading)).toBe(true);
    expect(precedes(shopHeading, description)).toBe(true);
    expect(precedes(description, socials)).toBe(true);
    const intro = container.querySelector(".creator-intro.compact")!;
    expect(within(intro as HTMLElement).getByText("Everyday style"));
    expect(intro.querySelector(".creator-bio")).toBeNull();
    expect(
      container.querySelector(".creator-about .creator-facts"),
    ).not.toBeNull();
    expect(intro.nextElementSibling).toHaveClass("creator-shop");
  });

  it("header social icons have accessible names", () => {
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
  });
});
