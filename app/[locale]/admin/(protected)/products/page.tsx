import { renderAdminPerformance } from "@/src/infrastructure/admin-performance-page";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  return renderAdminPerformance(locale, query, "products");
}
