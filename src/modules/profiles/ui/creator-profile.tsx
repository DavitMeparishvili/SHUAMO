/* eslint-disable @next/next/no-img-element */
import { Icon, type IconName } from "@/src/modules/design-system";
import { profileDesignCopy } from "./profile-design-copy";
import type { ReactNode } from "react";
import type { Locale } from "@/src/modules/localization";
import type { PublicShopItem } from "../domain/creator-shop";
import { CreatorDescription } from "./creator-description";
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
const SOCIAL_ICONS = {
  instagram: "instagram",
  youtube: "youtube",
  tiktok: "tiktok",
  facebook: "facebook",
  website: "globe",
} as const satisfies Record<string, IconName>;
function socialIcon(platform: string | undefined): IconName {
  return platform && Object.hasOwn(SOCIAL_ICONS, platform)
    ? SOCIAL_ICONS[platform as keyof typeof SOCIAL_ICONS]
    : "link";
}
/**
 * The public creator page, top to bottom: identity header ending in the
 * creator's social links, the shop, featured work, the viewer's action and
 * the disclosure. Sections without content are left out entirely; spacing,
 * not borders, separates what remains.
 */
export function CreatorProfile({
  profile,
  locale,
  action,
  preview = false,
  shop = [],
  shopAction,
  shopCallout,
  copy,
}: {
  profile: CreatorProfileView;
  locale: Locale;
  action?: ReactNode;
  preview?: boolean;
  /** Publicly shown shop items, listed right after the header. */
  shop?: PublicShopItem[];
  /** Owner preview only: a control beside the shop heading. */
  shopAction?: ReactNode;
  /** Owner preview only: shown in place of an empty shop. */
  shopCallout?: ReactNode;
  copy: {
    preview: string;
    approved: string;
    ledger: string;
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
  const socials = (
    Array.isArray(profile.socialLinks) ? profile.socialLinks : []
  ).filter((raw): raw is { platform?: string; url: string } =>
    Boolean((raw as { url?: unknown } | null)?.url),
  );
  const work = Array.isArray(profile.featuredWork) ? profile.featuredWork : [];
  const ui = profileDesignCopy(locale);
  const facts = [
    { label: copy.languages, values: profile.languages },
    { label: copy.contentFormats, values: profile.contentFormats },
  ].filter((fact) => fact.values.length > 0);
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
          {tagline.text ? (
            <p className="profile-tagline">
              {tagline.text}
              <FallbackLabel from={tagline.fallbackFrom} copy={copy.fallback} />
            </p>
          ) : null}
          {description.text ? (
            <CreatorDescription readMore={ui.readMore} showLess={ui.showLess}>
              {description.text}
              <FallbackLabel
                from={description.fallbackFrom}
                copy={copy.fallback}
              />
            </CreatorDescription>
          ) : null}
          {profile.categories.length ? (
            <div className="profile-chips creator-categories">
              {profile.categories.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}
          {facts.length ? (
            <dl className="creator-facts">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.values.join(" · ")}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {socials.length ? (
            <ul className="creator-socials" aria-label={ui.socialProfiles}>
              {socials.map((item, index) => (
                <li key={index}>
                  <ExternalLink href={item.url} leaveLabel={copy.leave}>
                    <span className="creator-social-tile">
                      <Icon
                        name={socialIcon(item.platform)}
                        data-social={item.platform}
                      />
                    </span>
                    <span className="creator-social-name">
                      {item.platform &&
                      Object.hasOwn(copy.socialLabels, item.platform)
                        ? copy.socialLabels[item.platform]
                        : item.platform}
                    </span>
                  </ExternalLink>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
      {shop.length ? (
        <CreatorShop items={shop} locale={locale} action={shopAction} />
      ) : (
        shopCallout
      )}
      {work.length ? (
        <section className="creator-work profile-section" id="featured-work">
          <h2>{copy.work}</h2>
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
    </div>
  );
}
