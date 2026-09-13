import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { currentViewer, requireAdmin } from "@/src/modules/identity";
import { isLocale } from "@/src/modules/localization";
import "@/app/finance.css";
export default async function AdminLayout({
  params,
  children,
}: {
  params: Promise<{ locale: string }>;
  children: ReactNode;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const access = requireAdmin(await currentViewer());
  if (!access.ok) {
    if (access.error === "unauthenticated") redirect(`/${locale}/admin/login`);
    notFound();
  }
  return children;
}
