import { renderTeamPerformance } from "@/src/infrastructure/team-performance-page";
import "@/app/finance.css";
export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  return renderTeamPerformance(locale, query);
}
