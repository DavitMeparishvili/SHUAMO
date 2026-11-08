/* eslint-disable @next/next/no-img-element */
import { Icon } from "@/src/modules/design-system";
import { profileDesignCopy } from "./profile-design-copy";
import type { ReactNode } from "react";
import type { Locale } from "@/src/modules/localization";
import type { PublicShopItem } from "../domain/creator-shop";
import { CreatorShop } from "./creator-shop";
import {
  ExternalLink,
  FallbackLabel,
  asLocalized,
  localized,
} from "./profile-shared";
export interface CreatorProfileView {
  slug: string | null;
  taglineKa: string;
  taglineEn: string;
  descriptionKa: string;
  descriptionEn: string;
  locationKa: string;
  locationEn: string;
  heroImageUrl: string;
  categories: string[];
  languages: string[];
  contentFormats: string[];
  socialLinks: unknown;
  featuredWork: unknown;
  creator: { displayName: string };
}
function socialIcon(platform: string | undefined) {
  return platform === "instagram" ||
    platform === "youtube" ||
    platform === "tiktok"
    ? platform
    : "link";
}
export function CreatorProfile({
  profile,
  locale,
  action,
  preview = false,
  shop = [],
  copy,
}: {
  profile: CreatorProfileView;
  locale: Locale;
  action?: ReactNode;
  preview?: boolean;
  /** Publicly shown shop items. When present, the shop leads the page. */
  shop?: PublicShopItem[];
  copy: {
    preview: string;
    approved: string;
    ledger: string;
    supplied: string;
    disclosure: string;
    work: string;
    leave: string;
    fallback: string;
    source: string;
    languages: string;
    contentFormats: string;
    heroAlt: string;
    workAlt: string;
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
  const socials = Array.isArray(profile.socialLinks) ? profile.socialLinks : [];
  const work = Array.isArray(profile.featuredWork) ? profile.featuredWork : [];
  const ui = profileDesignCopy(locale);
  const previewNote = preview ? (
    <div className="profile-preview-note">{copy.preview}</div>
  ) : null;
  const portrait = (
    <div className="creator-portrait">
      {profile.heroImageUrl ? (
        <img
          src={profile.heroImageUrl}
          alt={copy.heroAlt.replace("{name}", profile.creator.displayName)}
        />
      ) : (
        <Icon name="user" />
      )}
    </div>
  );
  const identity = (
    <div className="creator-identity">
      <h1>{profile.creator.displayName}</h1>
      {location.text ? (
        <p className="profile-location">
          <Icon name="pin" />
          {location.text}
          <FallbackLabel from={location.fallbackFrom} copy={copy.fallback} />
        </p>
      ) : null}
    </div>
  );
  const taglineText = (
    <p className="profile-tagline">
      {tagline.text}
      <FallbackLabel from={tagline.fallbackFrom} copy={copy.fallback} />
    </p>
  );
  const descriptionText = description.text ? (
    <p>
      {description.text}
      <FallbackLabel from={description.fallbackFrom} copy={copy.fallback} />
    </p>
  ) : null;
  const categories = (
    <div className="profile-chips creator-categories">
      {profile.categories.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
  const facts =
    profile.languages.length || profile.contentFormats.length ? (
      <dl className="creator-facts">
        <div>
          <dt>{copy.languages}</dt>
          <dd>{profile.languages.join(" · ")}</dd>
        </div>
        <div>
          <dt>{copy.contentFormats}</dt>
          <dd>{profile.contentFormats.join(" · ")}</dd>
        </div>
      </dl>
    ) : null;
  const rest = (
    <>
      <section className="creator-socials profile-section">
        <h2>{ui.socialProfiles}</h2>
        <div className="creator-social-grid">
          {socials.map((raw, index) => {
            const item = raw as { platform?: string; url?: string };
            return item.url ? (
              <ExternalLink key={index} href={item.url} leaveLabel={copy.leave}>
                <Icon
                  name={socialIcon(item.platform)}
                  data-social={item.platform}
                />
                {copy.socialLabels[item.platform ?? ""] ?? item.platform}
              </ExternalLink>
            ) : null;
          })}
        </div>
        <p className="profile-caption">{ui.supplied}</p>
      </section>
      {work.length ? (
        <section className="creator-work profile-section" id="featured-work">
          <div className="profile-section-heading">
            <h2>{copy.work}</h2>
            <a href="#featured-work">
              {ui.viewAll} {"↗"}
            </a>
          </div>
          <div className="profile-work-grid">
            {work.map((raw, index) => {
              const item = raw as {
                title?: unknown;
                url?: string;
                imageUrl?: string;
              };
              const title = asLocalized(item.title);
              const shown = localized(title.ka, title.en, locale);
              return item.url ? (
                <a
                  className="profile-work"
                  href={item.url}
                  key={index}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="profile-work-image">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={copy.workAlt.replace("{title}", shown.text)}
                      />
                    ) : null}
                  </div>
                  <h3>
                    {shown.text} <span aria-hidden="true">{"↗"}</span>
                    <FallbackLabel
                      from={shown.fallbackFrom}
                      copy={copy.fallback}
                    />
                  </h3>
                  <span className="sr-only">{copy.leave}</span>
                </a>
              ) : null;
            })}
          </div>
        </section>
      ) : null}
      {action ? <div className="profile-connect">{action}</div> : null}
      <p className="profile-disclosure">{copy.disclosure}</p>
    </>
  );

  if (shop.length === 0) {
    return (
      <div className="profile-creator profile-view">
        {previewNote}
        <section className="creator-intro">
          {portrait}
          {identity}
          <div className="creator-bio">
            {taglineText}
            {descriptionText}
          </div>
          {categories}
          {facts}
        </section>
        {rest}
      </div>
    );
  }

  // Shop-first layout: a compact identity header, the shop, then the rest of
  // the profile in its usual order.
  const socialIcons = socials.flatMap((raw, index) => {
    const item = raw as { platform?: string; url?: string };
    if (!item.url) return [];
    const label = copy.socialLabels[item.platform ?? ""] ?? item.platform;
    return [
      <ExternalLink key={index} href={item.url} leaveLabel={copy.leave}>
        <Icon name={socialIcon(item.platform)} data-social={item.platform} />
        <span className="sr-only">{label}</span>
      </ExternalLink>,
    ];
  });
  const hasAbout =
    Boolean(descriptionText) || profile.categories.length > 0 || facts;
  return (
    <div className="profile-creator profile-view">
      {previewNote}
      <section className="creator-intro compact">
        {portrait}
        {identity}
        {tagline.text ? (
          <div className="creator-compact-tagline">{taglineText}</div>
        ) : null}
        {socialIcons.length ? (
          <div className="creator-social-icons">{socialIcons}</div>
        ) : null}
      </section>
      <CreatorShop items={shop} locale={locale} />
      {hasAbout ? (
        <section className="creator-about profile-section">
          {descriptionText}
          {profile.categories.length ? categories : null}
          {facts}
        </section>
      ) : null}
      {rest}
    </div>
  );
}
