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
  return (
    <div className="profile-creator pb-16">
      {preview ? (
        <div className="mx-auto mt-6 max-w-[var(--layout-column)] rounded-sm bg-accrued-soft px-4 py-3 font-semibold text-accrued">
          {copy.preview}
        </div>
      ) : null}
      <section className="mx-auto grid max-w-[1440px] grid-cols-[1.55fr_1fr] border-b border-slate-200 max-[760px]:grid-cols-1">
        <div className="min-h-[430px] bg-slate-100 max-[760px]:min-h-0 max-[760px]:aspect-[4/3]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="h-full w-full object-cover"
            src={profile.heroImageUrl}
            alt={copy.heroAlt.replace("{name}", profile.creator.displayName)}
          />
        </div>
        <div className="flex flex-col justify-center px-16 py-12 max-[900px]:px-8 max-[639px]:px-4">
          <h1 className="m-0 text-[clamp(2.3rem,5vw,4.2rem)] font-bold leading-[1.02] tracking-[-0.035em] text-ink">
            {profile.creator.displayName}
          </h1>
          <p className="mb-2 mt-6 text-lg text-slate-600">
            {tagline.text}
            <FallbackLabel from={tagline.fallbackFrom} copy={copy.fallback} />
          </p>
          {description.text ? (
            <p className="my-2 text-slate-700">
              {description.text}
              <FallbackLabel
                from={description.fallbackFrom}
                copy={copy.fallback}
              />
            </p>
          ) : null}
          {location.text ? (
            <p className="my-2 text-slate-600">
              ⌖ {location.text}
              <FallbackLabel
                from={location.fallbackFrom}
                copy={copy.fallback}
              />
            </p>
          ) : null}
          <div className="my-4 flex flex-wrap gap-x-3 gap-y-1 text-ink">
            {profile.categories.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
          {profile.languages.length || profile.contentFormats.length ? (
            <dl className="my-2 grid gap-3 type-small text-slate-600">
              {profile.languages.length ? (
                <div>
                  <dt className="font-semibold text-ink">{copy.languages}</dt>
                  <dd className="m-0">{profile.languages.join(" · ")}</dd>
                </div>
              ) : null}
              {profile.contentFormats.length ? (
                <div>
                  <dt className="font-semibold text-ink">
                    {copy.contentFormats}
                  </dt>
                  <dd className="m-0">{profile.contentFormats.join(" · ")}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {action ? <div className="mt-4 [&>*]:w-full">{action}</div> : null}
        </div>
      </section>
      <div className="mx-auto max-w-[var(--layout-column)] px-[var(--layout-gutter)] max-[1179px]:px-[var(--layout-gutter-md)] max-[639px]:px-[var(--layout-gutter-sm)]">
        <section className="my-8 rounded-sm border border-signal-200 bg-signal-50/40 p-6">
          <h2 className="mt-0 type-h3 text-ink">{copy.ledger}</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] divide-x divide-slate-200 max-[639px]:grid-cols-1 max-[639px]:divide-x-0 max-[639px]:divide-y">
            {socials.map((raw, index) => {
              const item = raw as { platform?: string; url?: string };
              return item.url ? (
                <div
                  className="px-5 py-3 first:pl-0 max-[639px]:px-0"
                  key={index}
                >
                  <strong className="block capitalize text-ink">
                    {copy.socialLabels[item.platform ?? ""] ?? item.platform}
                  </strong>
                  <ExternalLink href={item.url} leaveLabel={copy.leave}>
                    {new URL(item.url).hostname}
                  </ExternalLink>
                  <span className="mt-2 block type-caption text-slate-600">
                    {copy.source}
                  </span>
                </div>
              ) : null;
            })}
            <div className="px-5 py-3 max-[639px]:px-0">
              <strong className="block text-ink">{copy.approved}</strong>
              <span className="mt-2 block type-caption text-slate-600">
                {copy.supplied}
              </span>
            </div>
          </div>
          <p className="mb-0 mt-4 border-t border-slate-200 pt-3 type-caption text-slate-600">
            ⓘ {copy.disclosure}
          </p>
        </section>
        {work.length ? (
          <section>
            <h2 className="type-h2 text-ink">{copy.work}</h2>
            <div className="grid grid-cols-3 gap-5 max-[639px]:grid-cols-1">
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
                    className="group text-ink no-underline"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={index}
                  >
                    <div className="aspect-[16/9] overflow-hidden rounded-sm bg-slate-100">
                      {item.imageUrl ? (
                        <>
                          {" "}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                            src={item.imageUrl}
                            alt={copy.workAlt.replace("{title}", shown.text)}
                          />
                        </>
                      ) : null}
                    </div>
                    <h3 className="mb-0 mt-3 type-h3">
                      {shown.text}
                      <FallbackLabel
                        from={shown.fallbackFrom}
                        copy={copy.fallback}
                      />
                    </h3>
                    <span className="sr-only"> {copy.leave}</span>
                  </a>
                ) : null;
              })}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
