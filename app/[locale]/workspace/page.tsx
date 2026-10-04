import { notFound, redirect } from "next/navigation";
import { currentViewer, auth } from "@/src/modules/identity";
import { headers } from "next/headers";
import { prisma } from "@/src/infrastructure/db/client";
import { isLocale } from "@/src/modules/localization";
import { profileIsPublished } from "@/src/infrastructure/profile-onboarding";
import { safeProfileReturnTo } from "@/src/modules/identity";

export default async function WorkspaceRouter({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const viewer = await currentViewer();
  if (viewer.kind === "brand" || viewer.kind === "creator") {
    if (!(await profileIsPublished(viewer)))
      redirect(`/${locale}/${viewer.kind}/profile`);
    const returnTo = safeProfileReturnTo(locale, (await searchParams).returnTo);
    redirect(returnTo ?? `/${locale}/${viewer.kind}`);
  }
  if (viewer.kind === "admin") redirect(`/${locale}/admin/finance`);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(`/${locale}/sign-in`);
  const account = await prisma.appUser.findUnique({
    where: { id: session.user.id },
    include: { brand: true, creator: true },
  });
  if (!account?.brand && !account?.creator) redirect(`/${locale}/sign-up`);
  if (
    account?.accessDisabled ||
    account?.brand?.status === "SUSPENDED" ||
    account?.creator?.status === "SUSPENDED"
  )
    redirect(`/${locale}/sign-in?status=suspended`);
  redirect(`/${locale}/sign-up?status=pending`);
}
