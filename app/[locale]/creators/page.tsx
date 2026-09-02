import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  listPublicCreatorProfiles,
  ProfileDirectory,
} from "@/src/modules/profiles";
export const metadata: Metadata = { robots: { index: true, follow: true } };
export const dynamic = "force-dynamic";
export default async function CreatorsDirectory({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string; location?: string }>;
}) {
  const [{ locale }, filters] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  const rows = await listPublicCreatorProfiles(locale, {
    ...(filters.q ? { query: filters.q } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.location ? { location: filters.location } : {}),
  });
  return (
    <ProfileDirectory
      role="creators"
      locale={locale}
      items={rows.flatMap((x) =>
        x.slug
          ? [
              {
                id: x.id,
                slug: x.slug,
                name: x.creator.displayName,
                taglineKa: x.taglineKa,
                taglineEn: x.taglineEn,
                locationKa: x.locationKa,
                locationEn: x.locationEn,
                imageUrl: x.heroImageUrl,
                categories: x.categories,
              },
            ]
          : [],
      )}
      copy={{
        title: t(messages, "directory.creators.title"),
        intro: t(messages, "directory.creators.intro"),
        search: t(messages, "directory.search"),
        category: t(messages, "directory.category"),
        location: t(messages, "directory.location"),
        filter: t(messages, "directory.filter"),
        empty: t(messages, "directory.empty"),
        emptyBody: t(messages, "directory.emptyBody"),
        fallback: t(messages, "profile.fallback"),
        imageAlt: t(messages, "directory.creatorImageAlt"),
      }}
    />
  );
}
