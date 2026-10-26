"use client";

import { useId, useState, useTransition } from "react";

type Lead = { id: string; displayName: string };

export function TeamSettingsControl({
  creatorId,
  locale,
  initial,
  leads,
}: {
  creatorId: string;
  locale: "ka" | "en";
  initial: {
    isTeamLead: boolean;
    teamLeadId: string | null;
    teamLeadName?: string | null;
    memberCount: number;
  };
  leads: Lead[];
}) {
  const text = (en: string, ka: string) => (locale === "ka" ? ka : en);
  const id = useId();
  const [isTeamLead, setIsTeamLead] = useState(initial.isTeamLead);
  const [teamLeadId, setTeamLeadId] = useState(initial.teamLeadId);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const options = leads.filter((lead) => lead.id !== creatorId);
  // A lead who was switched off or suspended is no longer offered, but the
  // saved value still has to show rather than silently read as "none".
  const staleLead =
    initial.teamLeadId !== null &&
    !options.some((lead) => lead.id === initial.teamLeadId);
  const hasMembers = initial.memberCount > 0;
  // Disabled states follow the current form values, so the combination the
  // server rejects (a lead who also has a lead) can't be built here.
  const hasLead = teamLeadId !== null;
  const leadLocked = hasMembers || isTeamLead;
  const memberCountText =
    initial.memberCount === 1
      ? text("1 team member", "1 გუნდის წევრი")
      : text(
          `${initial.memberCount} team members`,
          `${initial.memberCount} გუნდის წევრი`,
        );

  const errors: Record<string, string> = {
    self_lead: text(
      "A creator can't be their own team lead.",
      "კრეატორი საკუთარი გუნდის ლიდერი ვერ იქნება.",
    ),
    not_a_lead: text(
      "The chosen creator is no longer a team lead.",
      "არჩეული კრეატორი აღარ არის გუნდის ლიდერი.",
    ),
    lead_cannot_have_lead: text(
      "A team lead can't have a team lead. Clear this creator's team lead first.",
      "გუნდის ლიდერს თავად ლიდერი ვერ ეყოლება. ჯერ მოხსენი ამ კრეატორის ლიდერი.",
    ),
    has_members: text(
      "This creator still has team members. Remove them first.",
      "ამ კრეატორს ჯერ კიდევ ჰყავს გუნდის წევრები. ჯერ ისინი მოხსენი.",
    ),
  };

  function save() {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/creators/${creatorId}/team`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isTeamLead, teamLeadId }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: unknown;
          };
          throw new Error(typeof body.error === "string" ? body.error : "");
        }
        setMessage(
          text("Team settings saved.", "გუნდის პარამეტრები შენახულია."),
        );
      } catch (caught) {
        const code = caught instanceof Error ? caught.message : "";
        setError(
          errors[code] ??
            text(
              "Team settings could not be saved. Try again.",
              "გუნდის პარამეტრები ვერ შეინახა. სცადე თავიდან.",
            ),
        );
      }
    });
  }

  return (
    <section
      className="finance-panel admin-team-settings"
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`}>{text("Team", "გუნდი")}</h2>
      <p className="admin-team-settings-count">{memberCountText}</p>
      <div className="admin-team-settings-fields">
        <div className="admin-team-settings-field">
          <label className="admin-team-settings-toggle">
            <input
              type="checkbox"
              checked={isTeamLead}
              disabled={pending || hasLead}
              aria-describedby={hasLead ? `${id}-toggle-hint` : undefined}
              onChange={(event) => setIsTeamLead(event.target.checked)}
            />
            {text("This creator is a team lead", "ეს კრეატორი გუნდის ლიდერია")}
          </label>
          {hasLead ? (
            <span className="admin-team-settings-hint" id={`${id}-toggle-hint`}>
              {text(
                "Clear this creator's team lead first",
                "ჯერ მოხსენი ამ კრეატორის გუნდის ლიდერი",
              )}
            </span>
          ) : null}
        </div>
        <div className="admin-team-settings-field">
          <label htmlFor={`${id}-lead`}>
            {text("Assigned team lead", "მინიჭებული გუნდის ლიდერი")}
          </label>
          <select
            id={`${id}-lead`}
            value={teamLeadId ?? ""}
            disabled={pending || leadLocked}
            aria-describedby={leadLocked ? `${id}-lead-hint` : undefined}
            onChange={(event) => setTeamLeadId(event.target.value || null)}
          >
            <option value="">{text("No team lead", "ლიდერის გარეშე")}</option>
            {staleLead ? (
              <option value={initial.teamLeadId ?? ""}>
                {initial.teamLeadName
                  ? text(
                      `${initial.teamLeadName} (no longer active)`,
                      `${initial.teamLeadName} (აღარ არის აქტიური)`,
                    )
                  : text(
                      "Current lead (no longer active)",
                      "მიმდინარე ლიდერი (აღარ არის აქტიური)",
                    )}
              </option>
            ) : null}
            {options.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.displayName}
              </option>
            ))}
          </select>
          {leadLocked ? (
            <span className="admin-team-settings-hint" id={`${id}-lead-hint`}>
              {hasMembers
                ? initial.memberCount === 1
                  ? text(
                      "Remove this creator's 1 team member first",
                      "ჯერ მოხსენი ამ კრეატორის 1 გუნდის წევრი",
                    )
                  : text(
                      `Remove this creator's ${initial.memberCount} team members first`,
                      `ჯერ მოხსენი ამ კრეატორის ${initial.memberCount} გუნდის წევრი`,
                    )
                : text(
                    "Turn off team lead first",
                    "ჯერ გამორთე გუნდის ლიდერის სტატუსი",
                  )}
            </span>
          ) : null}
        </div>
      </div>
      <div className="admin-team-settings-actions">
        <button
          className="finance-button finance-primary"
          type="button"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={save}
        >
          {pending ? text("Saving…", "ინახება…") : text("Save", "შენახვა")}
        </button>
        {error || message ? (
          <span
            className={`finance-account-feedback${error ? " is-error" : ""}`}
            aria-live="polite"
          >
            {error || message}
          </span>
        ) : null}
      </div>
    </section>
  );
}
