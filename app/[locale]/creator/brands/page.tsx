import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { currentViewer, requireCreator } from "@/src/modules/identity";
import { isLocale } from "@/src/modules/localization";
import {
  BrandsDirectory,
  listBrandsForCreator,
} from "@/src/modules/partnerships";
import { applyAction } from "./actions";

export default async function CreatorBrandsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const allowed = requireCreator(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const brands = await listBrandsForCreator(allowed.value.creatorId);
  const localized = (ka: string, en: string) =>
    locale === "ka" ? ka || en : en || ka;
  return (
    <Suspense>
      <BrandsDirectory
        locale={locale}
        applyAction={applyAction.bind(null, locale)}
        items={brands.map((brand) => {
          const profile = brand.profile;
          const interests = Array.isArray(profile?.collaborationInterests)
            ? profile.collaborationInterests
            : [];
          return {
            id: brand.id,
            name: brand.name,
            createdAt: brand.createdAt.toISOString(),
            status: brand.status ?? "NOT_APPLIED",
            appliedAt: brand.appliedAt?.toISOString() ?? null,
            tagline: profile
              ? localized(profile.taglineKa, profile.taglineEn)
              : "",
            location: profile
              ? localized(profile.locationKa, profile.locationEn)
              : "",
            locationAliases: profile
              ? [profile.locationEn, profile.locationKa]
              : [],
            locationKey: profile
              ? profile.locationEn || profile.locationKa
              : "",
            imageUrl: profile ? profile.heroImageUrl || profile.logoUrl : "",
            profileHref: profile?.slug
              ? `/${locale}/brands/${profile.slug}`
              : null,
            categories: profile?.categories ?? [],
            interests: interests.flatMap((value) => {
              if (!value || typeof value !== "object" || Array.isArray(value))
                return [];
              const en = typeof value.en === "string" ? value.en : "";
              const ka = typeof value.ka === "string" ? value.ka : "";
              return en || ka
                ? [{ key: en || ka, label: localized(ka, en) }]
                : [];
            }),
          };
        })}
      />
    </Suspense>
  );
}
