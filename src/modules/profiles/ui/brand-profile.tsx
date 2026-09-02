import type { ReactNode } from "react";
import type { Locale } from "@/src/modules/localization";
import {
  ExternalLink,
  FallbackLabel,
  asLocalized,
  localized,
} from "./profile-shared";

export interface BrandProfileView {
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
}: {
  profile: BrandProfileView;
  locale: Locale;
  action?: ReactNode;
  preview?: boolean;
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
  return (
    <div className="profile-brand mx-auto max-w-[var(--layout-column)] px-[var(--layout-gutter)] py-10 max-[1179px]:px-[var(--layout-gutter-md)] max-[639px]:px-[var(--layout-gutter-sm)]">
      {preview ? (
        <div className="mb-6 rounded-sm bg-accrued-soft px-4 py-3 font-semibold text-accrued">
          {copy.preview}
        </div>
      ) : null}
      <div className="grid grid-cols-[minmax(260px,0.34fr)_minmax(0,0.66fr)] gap-14 max-[800px]:grid-cols-1">
        <div className="self-start border-r border-slate-200 pr-12 max-[800px]:border-r-0 max-[800px]:border-b max-[800px]:pb-8 max-[800px]:pr-0">
          <div className="relative aspect-[4/4.15] overflow-hidden rounded-sm bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="h-full w-full object-cover"
              src={profile.heroImageUrl}
              alt={copy.heroAlt.replace("{name}", profile.brand.name)}
            />
          </div>
          {profile.logoUrl ? (
            <div className="relative -mt-11 ml-2 h-20 w-20 overflow-hidden rounded-full border-4 border-paper bg-paper shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="h-full w-full object-cover"
                src={profile.logoUrl}
                alt={copy.logoAlt.replace("{name}", profile.brand.name)}
              />
            </div>
          ) : null}
          <h1 className="mb-1 mt-4 type-h1 text-ink">{profile.brand.name}</h1>
          <p className="my-0 text-slate-600">
            {tagline.text}
            <FallbackLabel from={tagline.fallbackFrom} copy={copy.fallback} />
          </p>
          {location.text ? (
            <p className="my-4 text-ink">
              ⌖ {location.text}
              <FallbackLabel
                from={location.fallbackFrom}
                copy={copy.fallback}
              />
            </p>
          ) : null}
          <div className="my-5 border-y border-slate-200 py-4 font-semibold text-ink">
            ✓ {copy.approved}
          </div>
          <div className="grid divide-y divide-slate-200">
            {socials.map((raw, index) => {
              const item = raw as { platform?: string; url?: string };
              return item.url ? (
                <ExternalLink
                  href={item.url}
                  leaveLabel={copy.leave}
                  key={`${item.platform}-${index}`}
                >
                  {copy.socialLabels[item.platform ?? ""] ?? item.platform}
                </ExternalLink>
              ) : null;
            })}
          </div>
          {action ? <div className="mt-5 [&>*]:w-full">{action}</div> : null}
        </div>
        <article className="min-w-0 py-3">
          <h2 className="mt-0 type-h1 text-ink">{profile.brand.name}</h2>
          <p className="max-w-[65ch] text-lg text-slate-700">
            {description.text}
            <FallbackLabel
              from={description.fallbackFrom}
              copy={copy.fallback}
            />
          </p>
          {make.length ? (
            <section className="profile-rule">
              <h2>{copy.whatWeMake}</h2>
              <div className="grid grid-cols-3 gap-4 max-[639px]:grid-cols-1">
                {make.map((raw, index) => {
                  const value = localized(
                    asLocalized((raw as { label?: unknown }).label).ka,
                    asLocalized((raw as { label?: unknown }).label).en,
                    locale,
                  );
                  return (
                    <div
                      className="border-b border-slate-300 py-4 font-semibold text-ink"
                      key={index}
                    >
                      {value.text}
                      <FallbackLabel
                        from={value.fallbackFrom}
                        copy={copy.fallback}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
          {profile.featuredProducts.length ? (
            <section className="profile-rule">
              <h2>{copy.products}</h2>
              <div className="grid grid-cols-3 gap-5 max-[639px]:grid-cols-1">
                {profile.featuredProducts.map((product) => (
                  <a
                    className="group text-ink no-underline"
                    href={product.backlinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={product.id}
                  >
                    <div className="aspect-square overflow-hidden rounded-sm bg-slate-100">
                      {product.imageUrls[0] ? (
                        <>
                          {" "}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                            src={product.imageUrls[0]}
                            alt={product.title}
                          />
                        </>
                      ) : null}
                    </div>
                    <h3 className="mb-0 mt-3 type-h3">{product.title}</h3>
                    <span className="sr-only"> {copy.leave}</span>
                  </a>
                ))}
              </div>
            </section>
          ) : null}
          {interests.length ? (
            <section className="profile-rule">
              <h2>{copy.interests}</h2>
              <div className="flex flex-wrap gap-2">
                {interests.map((raw, index) => {
                  const value = resolveInterest(raw, locale);
                  return (
                    <span
                      className="rounded-sm border border-slate-300 px-4 py-2"
                      key={index}
                    >
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
          {socials.length ? (
            <section className="profile-rule">
              <h2>{copy.socials}</h2>
              <div className="divide-y divide-slate-200">
                {socials.map((raw, index) => {
                  const item = raw as { platform?: string; url?: string };
                  return item.url ? (
                    <div
                      className="flex items-center justify-between gap-4 py-3"
                      key={index}
                    >
                      <span className="capitalize text-ink">
                        {copy.socialLabels[item.platform ?? ""] ??
                          item.platform}
                      </span>
                      <ExternalLink href={item.url} leaveLabel={copy.leave}>
                        {new URL(item.url).hostname}
                      </ExternalLink>
                    </div>
                  ) : null;
                })}
              </div>
            </section>
          ) : null}
        </article>
      </div>
    </div>
  );
}
function resolveInterest(raw: unknown, locale: Locale) {
  const x = asLocalized(raw);
  return localized(x.ka, x.en, locale);
}
