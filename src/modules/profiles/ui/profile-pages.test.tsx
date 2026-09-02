// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandProfile } from "./brand-profile";
import { CreatorProfile } from "./creator-profile";
const common = {
  preview: "Preview",
  approved: "SHUAMO approved account",
  leave: "Leaves",
  fallback: "From {locale}",
  heroAlt: "Featured image for {name}",
  socialLabels: {},
};
describe("public profile compositions", () => {
  it("PROFILE-004 brands name approval without social verification", () => {
    render(
      <BrandProfile
        locale="en"
        profile={{
          slug: "brand",
          taglineKa: "",
          taglineEn: "Tag",
          descriptionKa: "",
          descriptionEn: "Story",
          locationKa: "",
          locationEn: "Tbilisi",
          logoUrl: "/logo",
          heroImageUrl: "/hero",
          categories: ["Care"],
          whatWeMake: [],
          collaborationInterests: [],
          socialLinks: [],
          featuredProducts: [],
          brand: { name: "Aroma" },
        }}
        copy={{
          ...common,
          story: "Story",
          whatWeMake: "Make",
          products: "Products",
          interests: "Interests",
          socials: "Socials",
          logoAlt: "Logo for {name}",
        }}
      />,
    );
    expect(screen.getByText(/SHUAMO approved account/)).toBeInTheDocument();
    expect(screen.queryByText(/verified audience/i)).not.toBeInTheDocument();
  });
  it("creator ledger carries the required disclosure", () => {
    render(
      <CreatorProfile
        locale="en"
        profile={{
          slug: "nino",
          taglineKa: "",
          taglineEn: "Tag",
          descriptionKa: "",
          descriptionEn: "Bio",
          locationKa: "",
          locationEn: "Tbilisi",
          heroImageUrl: "/hero",
          categories: ["Fashion"],
          languages: [],
          contentFormats: [],
          socialLinks: [],
          featuredWork: [],
          creator: { displayName: "Nino" },
        }}
        copy={{
          ...common,
          ledger: "Ledger",
          supplied: "Account review",
          disclosure: "SHUAMO does not verify audience or performance claims.",
          work: "Work",
          source: "Source",
          languages: "Languages",
          contentFormats: "Content formats",
          workAlt: "Featured work: {title}",
        }}
      />,
    );
    expect(screen.getByText(/does not verify audience/)).toBeInTheDocument();
  });
});
