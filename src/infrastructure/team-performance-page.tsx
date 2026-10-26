import { notFound, redirect } from "next/navigation";
import {
  currentViewer,
  prismaTeamRepository,
  requireTeamLead,
  WorkspaceShell,
} from "@/src/modules/identity";
import { isLocale, type Locale } from "@/src/modules/localization";
import { parseAdminPerformanceQuery } from "@/src/modules/conversions";
import { AdminPerformance } from "@/src/modules/finance";
import {
  teamMemberPerformanceReport,
  teamPerformanceFinance,
  teamPerformanceReport,
} from "./team-performance-services";

const noOptions = { brands: [], creators: [] };

async function leadViewer(locale: string) {
  if (!isLocale(locale)) notFound();
  const viewer = await currentViewer(),
    access = requireTeamLead(viewer);
  if (!access.ok) {
    if (access.error === "unauthenticated") redirect(`/${locale}/sign-in`);
    notFound();
  }
  return { locale: locale as Locale, viewer, lead: access.value };
}

function invalidFilters(locale: Locale, resetHref: string) {
  return (
    <div className="finance-surface workspace-content">
      <h1>
        {locale === "ka" ? "ფილტრები არასწორია" : "Invalid report filters"}
      </h1>
      <p role="alert">
        {locale === "ka"
          ? "შეამოწმეთ თარიღები და არჩეული ანგარიშები."
          : "Check the dates and selected accounts."}
      </p>
      <a className="finance-button" href={resetHref}>
        {locale === "ka" ? "ფილტრების გასუფთავება" : "Reset filters"}
      </a>
    </div>
  );
}

// "My team": every member with the admin creators-row figures and payouts.
export async function renderTeamPerformance(
  rawLocale: string,
  raw: Record<string, string | string[] | undefined>,
) {
  const { locale, viewer, lead } = await leadViewer(rawLocale);
  const basePath = `/${locale}/creator/team`;
  const members = await prismaTeamRepository.members(lead.creatorId);
  if (!members.length)
    return (
      <WorkspaceShell
        name={lead.displayName}
        title={locale === "ka" ? "ჩემი გუნდი" : "My team"}
        intro={
          locale === "ka"
            ? "შენი გუნდის კრეატორების შედეგები და გადახდები."
            : "Results and payouts for the creators on your team."
        }
        showName={false}
      >
        <h2 className="m-0 type-h3 text-ink">
          {locale === "ka"
            ? "გუნდის წევრები ჯერ არ არიან"
            : "No team members yet"}
        </h2>
        <p className="mb-0 mt-2 text-slate-600">
          {locale === "ka"
            ? "კრეატორები შენს გუნდში რეგისტრაციისას გაწევრიანდებიან, როცა შენ აგირჩევენ ლიდერად."
            : "Creators join your team when they choose you as their team lead during registration."}
        </p>
      </WorkspaceShell>
    );
  const parsed = parseAdminPerformanceQuery({ ...raw, tab: "creators" });
  if (!parsed.ok) return invalidFilters(locale, basePath);
  const q = parsed.value;
  const result = await teamPerformanceReport(viewer, q);
  if (!result.ok) notFound();
  const finance = await teamPerformanceFinance(viewer, {
    from: q.from,
    to: q.to,
    creatorIds: result.value.rows.items.map((row) => row.id),
  });
  if (!finance.ok) notFound();
  return (
    <AdminPerformance
      report={result.value}
      finance={finance.value}
      options={noOptions}
      locale={locale}
      basePath={basePath}
      listPath={basePath}
      listPage="1"
      scope={{ kind: "team", members, memberPath: basePath }}
    />
  );
}

// One member's report. Anyone outside the lead's team is a 404.
export async function renderTeamMemberPerformance(
  rawLocale: string,
  memberId: string,
  raw: Record<string, string | string[] | undefined>,
) {
  const { locale, viewer, lead } = await leadViewer(rawLocale);
  const backHref = `/${locale}/creator/team`;
  const member = (await prismaTeamRepository.members(lead.creatorId)).find(
    (candidate) => candidate.id === memberId,
  );
  if (!member) notFound();
  const basePath = `${backHref}/${member.id}`;
  const parsed = parseAdminPerformanceQuery(raw);
  if (!parsed.ok) return invalidFilters(locale, basePath);
  const q = parsed.value;
  const result = await teamMemberPerformanceReport(viewer, member.id, q);
  if (!result.ok) notFound();
  const finance = await teamPerformanceFinance(viewer, {
    from: q.from,
    to: q.to,
    creatorIds: [member.id],
  });
  if (!finance.ok) notFound();
  return (
    <AdminPerformance
      report={result.value}
      finance={finance.value}
      options={noOptions}
      locale={locale}
      basePath={basePath}
      listPath={backHref}
      listPage="1"
      scope={{
        kind: "team_member",
        memberName: member.displayName,
        backHref,
      }}
    />
  );
}
