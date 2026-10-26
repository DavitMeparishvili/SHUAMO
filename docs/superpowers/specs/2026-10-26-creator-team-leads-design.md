# Creator Team Leads — Design

Date: 2026-10-26
Status: Draft for approval

## Intent

Some creators bring their own team of creators onto Xurjin. The person running
that team, the **team lead**, needs to see each member's activity and money so
they can claim their share of the team's earnings. The rules for that share are
not settled yet, so the app shows the numbers and doesn't do any splitting. The
administrator works out the lead's cut by hand and pays it through the existing
manual Finance flow.

There are only a few users, so this should be the simplest version that works.
There is no confirmation flow and no history tracking. The only new state is
two fields on `Creator`.

## Goals

- An administrator can make any creator a team lead, and can undo it.
- During registration, a creator can choose a team lead.
- A team lead sees a "My team" list showing each member's totals.
- A team lead can open a member and see what the administrator sees for that
  creator in Performance: a per-product breakdown with date filters, plus the
  member's invoiced and paid amounts.
- A team lead is still a normal creator: same links, earnings, finance and
  profile as before.

## Non-goals (for now)

- No lead share %, automatic splitting, or lead-side invoices or payouts.
- No confirmation from the lead or the administrator when a creator joins a
  team.
- Creators cannot change or leave their team after registration.
- Creators who already exist, or who skip the step, cannot pick a lead later.
  Only the administrator can set one. (The current creators are all test
  accounts.)
- No nested teams.
- No team view for brands, and no team lead entries on public profiles.

## Anti-goals

- Team leads must **not** receive `isAdmin` or any admin-area access.
- A lead must never see a creator who isn't on their team. Any other creator ID
  returns not found, not "forbidden", so the URL doesn't reveal whether that
  creator exists.
- A lead must not be able to edit anything about a member: links, profile or
  finance.
- A lead must not see members' payout details (bank, IBAN, payout name).

## Decided

### Data
- `Creator.isTeamLead Boolean @default(false)` (`is_team_lead`).
- `Creator.teamLeadId String? @db.Uuid` (`team_lead_id`). It is a
  self-relation to `Creator` with `onDelete: Restrict` and an index on it.
- One level only. A creator with `teamLeadId` set cannot be a team lead, a team
  lead cannot have a `teamLeadId`, and a creator cannot be their own lead.
- The team is "whoever currently has `teamLeadId` = this lead." There is no
  membership history, and the lead sees each member's full history.

### Administrator
- These controls go on the admin creator page
  (`admin/(protected)/profiles/creator/[id]`):
  - A **Team lead** on/off toggle.
  - A **Team lead** field showing the creator's current lead, which the admin
    can change or clear to fix mistakes.
- Turning a lead off keeps members' `teamLeadId`. The team is hidden while the
  lead is off and comes back when the toggle is turned on again. The "My team"
  nav item and pages are shown only while `isTeamLead` is true.
- The "change lead" field only offers creators who are currently team leads,
  and never the creator themselves.
- One-level rule, with blocking errors that say exactly what is wrong:
  - A creator who has a `teamLeadId` can't be switched on as a team lead.
  - A creator can't be given a lead while any creator's `teamLeadId` points to
    them, including when their team-lead toggle is currently off.
  - The admin fixes either case by clearing the other side first. Nothing is
    detached automatically.
- Both changes are written to `AuditEvent`.
- Making someone a team lead does not change their approval status or access.

### Registration
- The creator registration flow gets an optional **Team lead** field. It is a
  dropdown of creators where `isTeamLead = true`, status is APPROVED and
  `accessDisabled` is false, labelled by display name,
  with "No team lead" as the default.
- The server validates the chosen ID, which must be a current team lead. The ID
  is stored on the new `Creator` in the same transaction that creates it.
- After submission, the creator cannot change it.

### Team lead view (creator workspace)
- A **My team** nav item in the creator nav, shown only when the viewer is a
  team lead.
- **My team** list: one row per member with display name, approval status,
  link count (all links, of any status), and the admin Performance "creators"
  row figures for that member (creditable clicks, sales, earned commission),
  plus that member's admin finance figures (paid in period, unpaid). There is a
  team total row. It uses the same date filters and calculations as the admin
  Performance report and adds no new metrics: no cancelled-commission column,
  because the admin report doesn't have one. An empty team shows an explicit
  empty state.
- **Member page**, opened from a row, contains:
  - The admin Performance report with `creatorId` fixed to that member, showing
    only the overview, brands and products tabs, with date filters. There is no
    creators tab, no account picker, and no CSV export. A product drill-down,
    if offered, must also stay filtered to that member and must never list
    other creators.
  - That member's finance figures exactly as admin Performance shows them:
    `periodPayouts` (paid in the selected period) and `unpaid` (all time), from
    `adminPerformanceFinance`. Overall platform overpayment figures are not
    shown.
  - Everything is read-only. There are no admin controls, no record or reverse
    payment, no invoice issuing, and no payout details.
- Access: the viewer must be an approved creator who isn't access-disabled and
  has `isTeamLead` = true. This uses the same workspace gating that other
  creator pages already apply.
- Reuse the existing admin performance and finance queries
  (`src/modules/conversions/infrastructure/prisma-admin-performance.ts`,
  `src/infrastructure/admin-performance-services.ts`,
  `adminPerformanceFinance`) by adding a "team lead" access path that only
  allows `creatorId` values where `teamLeadId` = the viewer's creator ID and
  the viewer `isTeamLead`. Do not write a second report.

### General
- All new copy is bilingual (ka/en) with equal weight, following the existing
  localization messages.
- Follows `PRODUCT.md` principles: numbers traceable to source rows, state
  named in words, WCAG 2.2 AA.

## Left to the builder

- Which registration step the team lead field goes on (Profile or Channels fit
  best).
- The exact routes (suggested: `creator/team` and `creator/team/[id]`).
- How the admin "change lead" field is presented (a dropdown of team leads is
  fine).
- Whether the one-level rule is enforced only in the application layer or also
  with a DB check. The application layer is required; a DB check is optional.
- Visual layout, which should reuse the existing admin Performance and finance
  components where possible.
