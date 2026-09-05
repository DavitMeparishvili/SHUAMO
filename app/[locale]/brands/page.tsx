import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentViewer, requireCreator } from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  listPublicBrandProfiles,
  ProfileDirectory,
} from "@/src/modules/profiles";
export const metadata: Metadata = { robots: { index: true, follow: true } };
export const dynamic = "force-dynamic";
export default async function BrandsDirectory({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string; location?: string }>;
}) {
  const [{ locale }, filters] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  if (requireCreator(await currentViewer()).ok) {
    const query = new URLSearchParams();
    if (filters.q) query.set("q", filters.q);
    if (filters.category) query.set("category", filters.category);
    if (filters.location) query.set("location", filters.location);
    redirect(`/${locale}/creator/brands${query.size ? `?${query}` : ""}`);
  }
  const messages = getMessages(locale);
  const rows = await listPublicBrandProfiles(locale, {
    ...(filters.q ? { query: filters.q } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.location ? { location: filters.location } : {}),
  });
  return (
    <ProfileDirectory
      role="brands"
      locale={locale}
      items={rows.flatMap((x) =>
        x.slug
          ? [
              {
                id: x.id,
                slug: x.slug,
                name: x.brand.name,
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
        title: t(messages, "directory.brands.title"),
        intro: t(messages, "directory.brands.intro"),
        search: t(messages, "directory.search"),
        category: t(messages, "directory.category"),
        location: t(messages, "directory.location"),
        filter: t(messages, "directory.filter"),
        empty: t(messages, "directory.empty"),
        emptyBody: t(messages, "directory.emptyBody"),
        fallback: t(messages, "profile.fallback"),
        imageAlt: t(messages, "directory.brandImageAlt"),
      }}
    />
  );
}
