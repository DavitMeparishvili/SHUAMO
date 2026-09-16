/* eslint-disable @next/next/no-img-element */
import { Icon } from "@/src/modules/design-system";
import { profileDesignCopy } from "./profile-design-copy";
import type { ReactNode } from "react";
import type { Locale } from "@/src/modules/localization";
import {
  ExternalLink,
  FallbackLabel,
  asLocalized,
  localized,
} from "./profile-shared";

export interface BrandProfileView {
  brandId?: string;
  slug: string | null;
  taglineKa: string;
  taglineEn: string;
  descriptionKa: string;
  descriptionEn: string;
  locationKa: string;
  locationEn: string;
  logoUrl: string;
  heroImageUrl: string;
  categories: string[];
  whatWeMake: unknown;
  collaborationInterests: unknown;
  socialLinks: unknown;
  featuredProducts: {
    id: string;
    title: string;
    description: string;
    imageUrls: string[];
    backlinkUrl: string;
  }[];
  brand: { name: string };
}
export function BrandProfile({
  profile,
  locale,
  action,
  copy,
  preview = false,
  showApprovalBadge = true,
}: {
  profile: BrandProfileView;
  locale: Locale;
  action?: ReactNode;
  preview?: boolean;
  showApprovalBadge?: boolean;
  copy: {
    preview: string;
    approved: string;
    story: string;
    whatWeMake: string;
    products: string;
    interests: string;
    socials: string;
    leave: string;
    fallback: string;
    heroAlt: string;
    logoAlt: string;
    socialLabels: Record<string, string>;
  };
}) {
  const tagline = localized(profile.taglineKa, profile.taglineEn, locale);
  const description = localized(
    profile.descriptionKa,
    profile.descriptionEn,
    locale,
  );
  const location = localized(profile.locationKa, profile.locationEn, locale);
  const make = Array.isArray(profile.whatWeMake) ? profile.whatWeMake : [];
  const interests = Array.isArray(profile.collaborationInterests)
    ? profile.collaborationInterests
    : [];
  const socials = Array.isArray(profile.socialLinks) ? profile.socialLinks : [];
  const ui = profileDesignCopy(locale);
  const categories =
    !profile.categories.length && make.length
      ? make.map((raw) => {
          const label = asLocalized((raw as { label?: unknown }).label);
          return localized(label.ka, label.en, locale).text;
        })
      : profile.categories;
  return (
    <div className="profile-brand profile-view">
      {preview ? (
        <div className="profile-preview-note">{copy.preview}</div>
      ) : null}
      <div className="brand-cover">
        {profile.heroImageUrl ? (
          <img
            src={profile.heroImageUrl}
            alt={copy.heroAlt.replace("{name}", profile.brand.name)}
          />
        ) : null}
      </div>
      <div className="brand-profile-body">
        {profile.logoUrl ? (
          <img
            className="brand-profile-logo"
            src={profile.logoUrl}
            alt={copy.logoAlt.replace("{name}", profile.brand.name)}
          />
        ) : null}
        <div className="brand-identity">
          <div className="brand-heading">
            <h1>{profile.brand.name}</h1>
            {showApprovalBadge ? (
              <span className="profile-approved">
                <Icon name="check" />
                {copy.approved}
              </span>
            ) : null}
          </div>
          <p className="profile-tagline">
            {tagline.text}
            <FallbackLabel from={tagline.fallbackFrom} copy={copy.fallback} />
          </p>
          {location.text ? (
            <p className="profile-location">
              <Icon name="pin" />
              {location.text}
              <FallbackLabel
                from={location.fallbackFrom}
                copy={copy.fallback}
              />
            </p>
          ) : null}
          <div className="brand-profile-actions">
            <a
              className="profile-button primary"
              href={
                preview
                  ? "#featured-products"
                  : `/${locale}/products?brand=${encodeURIComponent(profile.brandId ?? "")}`
              }
            >
              {ui.browse}
              <Icon name="arrow" />
            </a>
            <div className="profile-social-inline">
              {socials.map((raw, index) => {
                const item = raw as { platform?: string; url?: string };
                return item.url ? (
                  <ExternalLink
                    key={index}
                    href={item.url}
                    leaveLabel={copy.leave}
                  >
                    <Icon
                      name={
                        item.platform === "instagram" ? "instagram" : "link"
                      }
                    />
                    {copy.socialLabels[item.platform ?? ""] ?? item.platform}
                  </ExternalLink>
                ) : null;
              })}
            </div>
          </div>
        </div>
        <section className="profile-section">
          <h2>{ui.description}</h2>
          <p>
            {description.text}
            <FallbackLabel
              from={description.fallbackFrom}
              copy={copy.fallback}
            />
          </p>
          <div className="profile-chips">
            {categories.map((item, index) => (
              <span key={index}>{item}</span>
            ))}
          </div>
        </section>
        {profile.featuredProducts.length ? (
          <section className="profile-section" id="featured-products">
            <div className="profile-section-heading">
              <h2>{copy.products}</h2>
              <a
                href={`/${locale}/products?brand=${encodeURIComponent(profile.brandId ?? "")}`}
              >
                {ui.viewAll} <span aria-hidden="true">{"\u2197"}</span>
              </a>
            </div>
            <div className="profile-product-grid">
              {profile.featuredProducts.map((product) => (
                <a
                  className="profile-product"
                  href={product.backlinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={product.id}
                >
                  <div className="profile-product-image">
                    {product.imageUrls[0] ? (
                      <img src={product.imageUrls[0]} alt={product.title} />
                    ) : null}
                  </div>
                  <h3>{product.title}</h3>
                  <span className="profile-product-link">
                    {ui.viewProduct} {"\u2197"}
                  </span>
                  <span className="sr-only">{copy.leave}</span>
                </a>
              ))}
            </div>
          </section>
        ) : null}
        {interests.length ? (
          <section className="profile-section profile-interests">
            <h2>{copy.interests}</h2>
            <div className="profile-chips">
              {interests.map((raw, index) => {
                const value = resolveInterest(raw, locale);
                return (
                  <span key={index}>
                    {value.text}
                    <FallbackLabel
                      from={value.fallbackFrom}
                      copy={copy.fallback}
                    />
                  </span>
                );
              })}
            </div>
          </section>
        ) : null}
        {action ? <div className="profile-connect">{action}</div> : null}
      </div>
    </div>
  );
}
function resolveInterest(raw: unknown, locale: Locale) {
  const x = asLocalized(raw);
  return localized(x.ka, x.en, locale);
}
