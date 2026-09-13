import { notFound, redirect } from "next/navigation";
import { currentViewer, auth } from "@/src/modules/identity";
import { headers } from "next/headers";
import { prisma } from "@/src/infrastructure/db/client";
import { isLocale } from "@/src/modules/localization";

export default async function WorkspaceRouter({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const viewer = await currentViewer();
  if (viewer.kind === "brand") redirect(`/${locale}/brand`);
  if (viewer.kind === "creator") redirect(`/${locale}/creator`);
  if (viewer.kind === "admin") redirect(`/${locale}/admin/finance`);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(`/${locale}/sign-in`);
  const account = await prisma.appUser.findUnique({
    where: { id: session.user.id },
    include: { brand: true, creator: true },
  });
  if (!account?.brand && !account?.creator) redirect(`/${locale}/sign-up`);
  if (
    account?.brand?.status === "SUSPENDED" ||
    account?.creator?.status === "SUSPENDED"
  )
    redirect(`/${locale}/sign-in?status=suspended`);
  redirect(`/${locale}/sign-up?status=pending`);
}
