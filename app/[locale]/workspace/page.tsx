import { notFound, redirect } from "next/navigation";
import { currentViewer } from "@/src/modules/identity";
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
  if (viewer.kind === "admin") redirect(`/${locale}/admin/periods`);
  redirect(`/${locale}/sign-in?status=not-approved`);
}
