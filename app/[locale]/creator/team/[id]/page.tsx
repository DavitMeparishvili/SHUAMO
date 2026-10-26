import { renderTeamMemberPerformance } from "@/src/infrastructure/team-performance-page";
import "@/app/finance.css";
export default async function TeamMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale, id }, query] = await Promise.all([params, searchParams]);
  return renderTeamMemberPerformance(locale, id, query);
}
