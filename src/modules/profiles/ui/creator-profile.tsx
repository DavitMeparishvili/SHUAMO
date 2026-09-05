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
export function CreatorProfile({
  profile,
  locale,
  action,
  preview = false,
  copy,
}: {
  profile: CreatorProfileView;
  locale: Locale;
  action?: ReactNode;
  preview?: boolean;
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
  return (
    <div className="profile-creator profile-view">
      {preview ? (
        <div className="profile-preview-note">{copy.preview}</div>
      ) : null}
      <section className="creator-intro">
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
        <div className="creator-identity">
          <h1>{profile.creator.displayName}</h1>
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
        </div>
        <div className="creator-bio">
          <p className="profile-tagline">
            {tagline.text}
            <FallbackLabel from={tagline.fallbackFrom} copy={copy.fallback} />
          </p>
          {description.text ? (
            <p>
              {description.text}
              <FallbackLabel
                from={description.fallbackFrom}
                copy={copy.fallback}
              />
            </p>
          ) : null}
        </div>
        <div className="profile-chips creator-categories">
          {profile.categories.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        {profile.languages.length || profile.contentFormats.length ? (
          <dl className="creator-facts">
            <div>
              <dt>{copy.languages}</dt>
              <dd>{profile.languages.join(" \u00b7 ")}</dd>
            </div>
            <div>
              <dt>{copy.contentFormats}</dt>
              <dd>{profile.contentFormats.join(" \u00b7 ")}</dd>
            </div>
          </dl>
        ) : null}
      </section>
      <section className="creator-socials profile-section">
        <h2>{ui.socialProfiles}</h2>
        <div className="creator-social-grid">
          {socials.map((raw, index) => {
            const item = raw as { platform?: string; url?: string };
            const icon =
              item.platform === "instagram" ||
              item.platform === "youtube" ||
              item.platform === "tiktok"
                ? item.platform
                : "link";
            return item.url ? (
              <ExternalLink key={index} href={item.url} leaveLabel={copy.leave}>
                <Icon name={icon} data-social={item.platform} />
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
              {ui.viewAll} {"\u2197"}
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
                    {shown.text} <span aria-hidden="true">{"\u2197"}</span>
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
    </div>
  );
}
