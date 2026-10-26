# Creator Team Leads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An administrator can mark creators as team leads. Creators can pick
a lead at registration. A team lead gets read-only "My team" pages showing
their members' admin-grade performance and payout figures.

**Architecture:** Two columns are added to `creator`. The team rules and data
access live in the identity module. Team reads reuse the existing admin
Performance repository (`prismaAdminPerformance`) and the finance read
(`prismaAdminPerformanceFinance`) through new use cases that use a team-lead
guard instead of `requireAdmin`. The server-rendered `AdminPerformance`
component gets an optional `scope` prop that strips everything admin-only.

**Tech Stack:** Next.js App Router (server components + route handlers),
Prisma 7 / PostgreSQL, zod, Vitest (unit + integration), pnpm.

**Spec:** `docs/superpowers/specs/2026-10-26-creator-team-leads-design.md`

## Global Constraints

- Team leads never get `isAdmin` or any `/admin` access.
- A lead asking for a creator who is not their member gets **not found**
  (404 / `notFound()`), never "forbidden".
- A lead never sees members' `payoutBank`, `payoutIban`, `payoutName`, brand
  finance figures, or platform-wide totals.
- One level only: a creator with `teamLeadId` cannot be a lead. A creator who
  any `teamLeadId` points to cannot be given a lead, even while their lead
  toggle is off. A creator cannot be their own lead.
- Turning a lead off keeps members' `teamLeadId`. Nothing is detached
  automatically.
- All UI copy is bilingual and follows each file's existing pattern (inline
  `text(en, ka)` / `t(en, ka)` or `messages` keys).
- Every admin change writes an `AuditEvent`.
- Run `pnpm verify:boundaries` before every commit. Modules import each other
  only through `index.ts`.

## Review Focus

1. **Guessing a member URL:** a lead opens `/creator/team/<another creator's
   id>`. Expected: 404. This is tested in Task 6 (use case) and Task 8 (page).
2. **A lead switched off:** the creator still has `teamLeadId` members, but
   `isTeamLead` is false. Expected: no nav item, and the team pages return 404.
   This is tested in Task 2 (viewer) and Task 6 (use case).
3. **A forged registration payload:** someone posts a `teamLeadId` that is not
   a lead, belongs to a suspended lead, or is sent with a brand role. Expected:
   400, and nothing is created. This is tested in Task 5.
4. **Leaking platform figures:** the overview tab on the member page must not
   render "Platform payments" or brand receipts. This is tested in Task 7.
5. **Admin making a nested team:** the admin gives a lead to a creator whose
   toggle is off but who still has members. Expected: 409 `has_members`. This
   is tested in Task 3.

---

### Task 1: Schema and migration

**Files:**
- Modify: `prisma/schema.prisma` (model `Creator`)
- Create: `prisma/migrations/20261026120000_creator_team_leads/migration.sql`
- Modify: `src/test/fixtures/accounts.ts` (`seedCreator` options)

**Interfaces:**
- Produces: `Creator.isTeamLead: boolean`, `Creator.teamLeadId: string | null`,
  relations `Creator.teamLead` / `Creator.teamMembers` (relation name
  `"CreatorTeam"`). `seedCreator({ isTeamLead?: boolean; teamLeadId?: string })`.

- [ ] **Step 1: Edit the schema.** On `Creator`, add
  `isTeamLead Boolean @default(false) @map("is_team_lead")` and
  `teamLeadId String? @map("team_lead_id") @db.Uuid`. Add
  `teamLead Creator? @relation("CreatorTeam", fields: [teamLeadId], references: [id], onDelete: Restrict)`,
  `teamMembers Creator[] @relation("CreatorTeam")`, and
  `@@index([teamLeadId], map: "creator_team_lead_idx")`.
- [ ] **Step 2: Write the migration by hand** so it matches the existing style.
  It adds both columns, the FK (`ON DELETE RESTRICT`), the index, and
  `ALTER TABLE "creator" ADD CONSTRAINT "creator_team_lead_not_self" CHECK ("team_lead_id" IS NULL OR "team_lead_id" <> "id");`.
- [ ] **Step 3: Apply it.** Run `pnpm db:migrate`, then `pnpm db:migrate:test`.
  Expected: both succeed, and `prisma generate` runs.
- [ ] **Step 4:** Extend `seedCreator` options with `isTeamLead` and
  `teamLeadId`, passed straight to `creator.create`.
- [ ] **Step 5: Verify.** Run `pnpm typecheck` and
  `pnpm test:integration src/modules/identity`. Expected: PASS.
- [ ] **Step 6: Commit.** Message: `feat: add creator team lead columns`.

### Task 2: Viewer flag and team-lead guard

**Files:**
- Modify: `src/modules/identity/ports/account-repository.ts` (`AccountRecord.creator` gains `isTeamLead: boolean`)
- Modify: `src/modules/identity/infrastructure/prisma-account-repository.ts`
- Modify: `src/modules/identity/domain/viewer.ts`
- Modify: `src/modules/identity/application/resolve-viewer.ts`
- Modify: `src/modules/identity/http/require-viewer.ts`, `src/modules/identity/index.ts`
- Modify: `src/modules/shell/ui/nav-model.ts`, localization messages (`nav.team`: "My team" / "ჩემი გუნდი")
- Test: `src/modules/identity/application/resolve-viewer.test.ts`, `src/modules/identity/http/require-viewer.test.ts`, `src/modules/shell/ui/nav-model.test.ts`

**Interfaces:**
- Produces: the creator `Viewer` variant gains `isTeamLead?: true`, set only
  when true, so existing `toEqual` fixtures stay valid.
  `requireTeamLead(viewer): Result<Extract<Viewer,{kind:"creator"}>, ViewerRejection>`
  is exported from identity.

- [ ] **Step 1: Write the failing tests.**
  - `resolveViewer` with `creator: {…, isTeamLead: true, status: "APPROVED"}`
    gives `toEqual({ kind: "creator", …, isAdmin: false, isTeamLead: true })`.
  - With `isTeamLead: false`, the result has no `isTeamLead` key.
  - `requireTeamLead`: anonymous → `err("unauthenticated")`; a creator without
    the flag → `err("wrong_capability")`; a brand → `err("wrong_capability")`;
    a creator with the flag → `ok(viewer)`.
  - `navDestinationsFor` for a lead includes
    `{ href: "/en/creator/team", labelKey: "nav.team" }`, placed right after
    `creator/earnings`. A non-lead creator does not get it.
- [ ] **Step 2:** Run `pnpm test:unit src/modules/identity src/modules/shell`.
  Expected: the new tests FAIL.
- [ ] **Step 3: Implement.** A suspended or access-disabled lead already
  resolves to `anonymous`, so `requireTeamLead` only needs
  `requireCreator` + `viewer.isTeamLead === true`.
- [ ] **Step 4:** Rerun. Expected: PASS. Then run `pnpm typecheck`.
- [ ] **Step 5: Commit.** Message: `feat: expose team lead capability on viewer`.

### Task 3: Admin team settings (rules, repository, API)

**Files:**
- Create: `src/modules/identity/domain/team.ts` + `team.test.ts`
- Create: `src/modules/identity/ports/team-repository.ts`
- Create: `src/modules/identity/infrastructure/prisma-team-repository.ts` + `team.integration.test.ts`
- Create: `src/modules/identity/application/set-team-settings.ts` + `.test.ts`
- Create: `src/modules/identity/http/admin-team-settings-handler.ts`
- Create: `app/api/admin/creators/[id]/team/route.ts`
- Modify: `src/modules/identity/index.ts`

**Interfaces:**
- Produces (domain):
  `type TeamRuleError = "self_lead" | "not_a_lead" | "lead_cannot_have_lead" | "has_members"`.
  `checkTeamSettings(input: { creatorId: string; isTeamLead: boolean; teamLeadId: string | null; memberCount: number; lead: { id: string; isTeamLead: boolean } | null }): TeamRuleError | undefined`.
- Produces (port `TeamRepository`):
  - `listLeads(): Promise<{ id: string; displayName: string }[]>`: creators
    with `isTeamLead`, status `APPROVED`, and `user.accessDisabled = false`,
    ordered by `displayName`.
  - `isMember(leadId: string, creatorId: string): Promise<boolean>`
  - `members(leadId: string): Promise<{ id: string; displayName: string; status: ApprovalStatus; accessDisabled: boolean; linkCount: number }[]>`.
    `linkCount` counts all `tracking_link` rows, any status.
  - `settings(creatorId: string): Promise<{ isTeamLead: boolean; teamLeadId: string | null; memberCount: number } | undefined>`
  - `setSettings(input: { actorId: string; creatorId: string; isTeamLead: boolean; teamLeadId: string | null }): Promise<{ ok: true } | { ok: false; error: "not_found" | TeamRuleError }>`.
    It runs in one transaction: it locks the creator row
    (`SELECT … FOR UPDATE`), loads the member count and lead, calls
    `checkTeamSettings`, updates, and writes audit events.
- Produces: `setTeamSettings(repo)(viewer, input: unknown)` returning
  `Result<{ isTeamLead; teamLeadId }, "unauthenticated" | "wrong_capability" | "invalid_input" | "not_found" | TeamRuleError>`,
  and `createAdminTeamSettingsHandler({ viewer, repository })`, which returns a
  `PATCH(request, { params: Promise<{ id }> })`.
  Also exported: `prismaTeamRepository`.

- [ ] **Step 1: Failing domain tests (`team.test.ts`).** Each case returns
  exactly the listed error:
  - `teamLeadId === creatorId` → `"self_lead"`
  - `lead: { isTeamLead: false }` → `"not_a_lead"`
  - `isTeamLead: true` with a `teamLeadId` → `"lead_cannot_have_lead"`
  - `teamLeadId` set with `memberCount: 1` and `isTeamLead: false` →
    `"has_members"`
  - a valid lead toggle (`isTeamLead: true, teamLeadId: null, memberCount: 3`)
    → `undefined`
  - a valid member assignment → `undefined`
- [ ] **Step 2: Failing use-case tests (`set-team-settings.test.ts`)** with an
  in-memory repository:
  - a non-admin → `wrong_capability`
  - body `{ isTeamLead: "yes" }` → `invalid_input`
  - the schema is `z.object({ id: z.uuid(), isTeamLead: z.boolean(), teamLeadId: z.uuid().nullable() })`
  - a repository `not_found` passes through
  - success returns the input values
- [ ] **Step 3: Failing integration tests (`team.integration.test.ts`)** using
  `seedCreator`:
  - `setSettings` toggles a lead on and writes an `AuditEvent` with
    `action: "creator.team_lead_role_changed"`, `changes: { from: false, to: true }`.
  - Assigning a lead writes `action: "creator.team_lead_changed"`,
    `changes: { from: null, to: <leadId> }`.
  - Turning the lead off keeps `member.teamLeadId`.
  - Giving a lead to that switched-off lead while it still has a member
    returns `{ ok: false, error: "has_members" }`, and the row is unchanged.
  - `listLeads` excludes a suspended lead and an `accessDisabled` lead.
  - `members` returns `linkCount` = 2 for a member with one ACTIVE and one
    DISABLED link.
  - `isMember` is false for a creator on another team.
  - No audit row is written when the values didn't change.
- [ ] **Step 4:** Run `pnpm test:unit src/modules/identity` and
  `pnpm test:integration src/modules/identity`. Expected: the new tests FAIL.
- [ ] **Step 5: Implement.** The domain, repository, use case and handler
  follow the existing `set-account-approval.ts` and
  `admin-account-status-handler.ts` patterns. Handler status codes:
  401/403/404, 400 for `invalid_input`, 409 for a `TeamRuleError`, with body
  `{ error }`. The route file mirrors
  `app/api/admin/accounts/[kind]/[id]/status/route.ts`.
- [ ] **Step 6:** Rerun both suites. Expected: PASS. Then run
  `pnpm verify:boundaries`.
- [ ] **Step 7: Commit.** Message: `feat: admin team lead settings`.

### Task 4: Admin creator page control

**Files:**
- Create: `src/modules/identity/ui/team-settings-control.tsx` (`"use client"`) + `team-settings-control.test.tsx`
- Modify: `app/[locale]/admin/(protected)/profiles/[kind]/[id]/page.tsx`, `src/modules/identity/index.ts`

**Interfaces:**
- Consumes: `prismaTeamRepository.settings`, `.listLeads`;
  `PATCH /api/admin/creators/[id]/team`.
- Produces: `TeamSettingsControl({ creatorId, locale, initial: { isTeamLead, teamLeadId, memberCount }, leads: { id, displayName }[] })`.

- [ ] **Step 1: Failing component tests** (Testing Library, matching
  `registration-form.test.tsx`):
  - It renders a "Team lead" checkbox and a "Team lead" select whose options
    are "No team lead" plus the leads, excluding `creatorId`.
  - The select is disabled with the hint "Remove this creator's
    {memberCount} team members first" when `memberCount > 0`.
  - The checkbox is disabled with the hint "Clear this creator's team lead
    first" when `teamLeadId` is set.
  - Saving sends
    `PATCH` with `{ isTeamLead, teamLeadId }` (`null` for "No team lead").
  - A 409 response shows the matching error text from the server's
    `error` code.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement.** Use the fetch/`useTransition`/message pattern of
  `AccountStatusControl`. Georgian copy: "გუნდის ლიდერი", "ლიდერის გარეშე",
  "შენახვა". On the page, render the control below the header only when
  `kind === "creator"`, and show the member count as text ("{n} team members"
  / "{n} გუნდის წევრი").
- [ ] **Step 4:** Rerun. Expected: PASS. Then run `pnpm typecheck`.
- [ ] **Step 5: Commit.** Message: `feat: team lead controls on admin creator page`.

### Task 5: Registration team lead field

**Files:**
- Modify: `src/modules/identity/application/registration-input.ts` + `registration-input.test.ts`
- Modify: `app/api/registration/route.ts`
- Modify: `src/modules/identity/infrastructure/registration.integration.test.ts`
- Modify: `src/modules/identity/ui/registration-form.tsx` + `registration-form.test.tsx`
- Modify: `app/[locale]/sign-up/page.tsx`

**Interfaces:**
- Consumes: `prismaTeamRepository.listLeads()`.
- Produces: `registrationSchema` field
  `teamLeadId: z.union([z.literal(""), z.uuid()]).default("")`.
  `RegistrationForm` prop `teamLeads?: { id: string; displayName: string }[]`.

- [ ] **Step 1: Failing schema tests.** `teamLeadId` with role `brand`, when
  not empty, fails with path `["teamLeadId"]`. A non-UUID fails. An empty
  value or a UUID passes for a creator.
- [ ] **Step 2: Failing integration tests.**
  - A creator posting a valid lead's id is created with
    `teamLeadId === lead.id` and status `APPROVED`.
  - A posted id belonging to a non-lead creator, a `SUSPENDED` lead, or an
    `accessDisabled` lead gives 400 with
    `{ error: "invalid_input", fields: { teamLeadId: ["invalid_team_lead"] } }`,
    and no `creator` row exists for the user.
  - Omitting the field creates a creator with `teamLeadId === null`.
- [ ] **Step 3: Failing form tests.**
  - With `teamLeads` given and `role="creator"`, the Profile stage
    (`data-stage="2"`) contains a select labelled "Team lead (optional)" with
    the first option "No team lead".
  - With `teamLeads=[]`, or for a brand, the field doesn't render.
  - The Review stage lists "Team lead" with the chosen display name, or
    "None" / "არ არის".
- [ ] **Step 4:** Run the tests. Expected: FAIL.
- [ ] **Step 5: Implement.**
  - The route, inside the existing transaction and before `creator.create`,
    checks `tx.creator.findFirst({ where: { id, isTeamLead: true, status: "APPROVED", user: { accessDisabled: false } } })`.
    If none matches, it throws `"invalid_team_lead"`, which the catch block
    maps to the 400 above. It sets `teamLeadId` on `creator.create`.
  - Add `"teamLeadId"` to the form's `fields` list.
  - The sign-up page passes
    `teamLeads={role === "creator" ? await prismaTeamRepository.listLeads() : []}`.
  - Georgian label: "გუნდის ლიდერი (არასავალდებულო)". Hint: "This can't be
    changed after registration." / "რეგისტრაციის შემდეგ ვეღარ შეცვლი."
- [ ] **Step 6:** Rerun the unit and integration suites for identity.
  Expected: PASS.
- [ ] **Step 7: Commit.** Message: `feat: choose team lead during creator registration`.

### Task 6: Team performance reads

**Files:**
- Modify: `src/modules/conversions/ports/admin-performance.ts` (`AdminPerformanceQuery` gains `teamLeadId?: string | undefined`)
- Modify: `src/modules/conversions/infrastructure/prisma-admin-performance.ts` (`source()` and the creators branch of `rowSource()`)
- Create: `src/modules/conversions/application/read-team-performance.ts` + `.test.ts`
- Create: `src/modules/finance/application/read-team-performance-finance.ts` + `.test.ts`
- Modify: `src/modules/finance/ports/admin-performance-finance.ts` (add `TeamPerformanceFinance`)
- Create: `src/infrastructure/team-performance-services.ts`
- Test: `src/modules/conversions/infrastructure/team-performance.integration.test.ts`
- Modify: the `index.ts` of conversions and finance

**Interfaces:**
- Consumes: `requireTeamLead`, `TeamRepository.isMember` / `.members`
  (Task 2/3), `AdminPerformanceRepository.report`, `prismaAdminPerformanceFinance`.
- Produces:
  - `readTeamPerformance(repo)(viewer, query: AdminPerformanceQuery)` →
    `Result<AdminPerformanceReport>`. It forces `tab: "creators"`,
    `teamLeadId: viewer.creatorId`, `creatorId: undefined`,
    `brandId: undefined`, `q: ""`, `productStatus: "ALL"`.
  - `readTeamMemberPerformance(repo, isMember)(viewer, memberId: string, query)`
    → `Result<AdminPerformanceReport, … | "not_found">`. It forces
    `creatorId: memberId` and `teamLeadId: undefined`, and coerces
    `tab: "creators"` to `"overview"`.
  - `TeamPerformanceFinance = { creators: { id: string; periodPayouts: string; unpaid: string }[] }`.
  - `readTeamPerformanceFinance(read, members)(viewer, { from, to, creatorIds })`
    → `Result<TeamPerformanceFinance>`. It is `not_found` if any id is not a
    member, and returns only the `creators` entries for the requested ids.
  - Wired exports in `team-performance-services.ts`: `teamPerformanceReport`,
    `teamMemberPerformanceReport`, `teamPerformanceFinance`.

- [ ] **Step 1: Failing unit tests** with fake repositories:
  - A non-lead creator → `wrong_capability`.
  - The lead's query reaches `repo.report` with `teamLeadId` = the lead's
    `creatorId` and `tab: "creators"`, even when the input has `creatorId`
    set to someone else.
  - A member read for a non-member → `not_found`, and `repo.report` is never
    called.
  - A non-UUID member id → `invalid_input`.
  - A member read with `tab: "creators"` reaches the repo as `"overview"`.
  - Finance with one non-member id → `not_found`.
  - The finance result has no `period`, `current` or `brands` keys.
- [ ] **Step 2: Failing integration test.** Seed lead L with members M1 and
  M2, plus outsider O, each with links and one confirmed attributed sale. Use
  existing fixtures from `src/test/fixtures/finance.ts` where they fit.
  - `prismaAdminPerformance.report({ …, tab: "creators", teamLeadId: L })`
    returns rows `{M1, M2}` only.
  - `totals.salesCount === 2`.
  - The admin report without `teamLeadId` still includes O, so admin behavior
    is unchanged.
- [ ] **Step 3:** Run the tests. Expected: FAIL.
- [ ] **Step 4: Implement.** When `q.teamLeadId` is set, add
  `AND tl.creator_id IN (SELECT id FROM creator WHERE team_lead_id=${q.teamLeadId}::uuid)`
  to `source()`'s filter, and `AND cr.team_lead_id=${q.teamLeadId}::uuid` to
  the creators `rowSource`. `parseAdminPerformanceQuery` must **not** accept
  `teamLeadId` from the URL; leave its schema unchanged.
- [ ] **Step 5:** Rerun, then run `pnpm verify:boundaries`. Expected: PASS.
- [ ] **Step 6: Commit.** Message: `feat: team-scoped performance and finance reads`.

### Task 7: `AdminPerformance` scope prop

**Files:**
- Modify: `src/modules/finance/ui/admin-performance.tsx`, `src/modules/finance/ui/admin-performance-filters.tsx`
- Test: `src/modules/finance/ui/admin-performance.test.tsx` (create if absent)

**Interfaces:**
- Consumes: `TeamPerformanceFinance` (Task 6).
- Produces: a new optional prop on `AdminPerformance`:
  ```ts
  scope?:
    | { kind: "team"; members: { id: string; status: "PENDING" | "APPROVED" | "SUSPENDED"; accessDisabled: boolean; linkCount: number }[]; memberPath: string }
    | { kind: "team_member"; memberName: string; backHref: string };
  ```
  `finance` is widened to `AdminPerformanceFinance | TeamPerformanceFinance`.
  `AdminPerformanceFilters` gains `datesOnly?: boolean`.
  With no `scope`, the output is unchanged.

- [ ] **Step 1: Failing render tests** (`renderToStaticMarkup` or Testing
  Library):
  - With either scope, the HTML contains no `href="/en/admin`, no CSV export
    link, no "Platform payments" text, and no brand/creator picker.
  - `team_member`: the tabs are Overview/Brands/Products only and link to
    `basePath`. The title is `memberName`, with a back link to `backHref`.
    Product rows are not links. The brands tab has no financial columns. The
    overview shows "Paid in period" and "Unpaid" for the member.
  - `team`: there are no tabs. `CommercialMetrics` renders `report.totals`
    above the table as the team total, with clicks shown. Each creator row
    links to
    `${memberPath}/${id}` and shows status in words ("Active", "Deactivated"
    when SUSPENDED or `accessDisabled`, "Pending") plus the link count. The
    paid-in-period/unpaid columns come from `finance.creators`.
  - Without `scope`, the existing admin snapshot or assertions still pass.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement.** Branch on `scope` at each admin-only spot listed
  above. Keep it to conditionals; don't fork the component. Georgian copy:
  "გადახდილი პერიოდში", "გადაუხდელი", "ბმულები", "ჩემი გუნდი".
- [ ] **Step 4:** Rerun the finance unit tests. Expected: PASS.
- [ ] **Step 5: Commit.** Message: `feat: team scopes for performance report UI`.

### Task 8: Team pages and end-to-end check

**Files:**
- Create: `app/[locale]/creator/team/page.tsx`, `app/[locale]/creator/team/[id]/page.tsx`
- Test: `src/test/e2e/team-leads.spec.ts`

**Interfaces:**
- Consumes: `teamPerformanceReport`, `teamMemberPerformanceReport`,
  `teamPerformanceFinance`, `prismaTeamRepository.members`,
  `parseAdminPerformanceQuery`, `AdminPerformance` with `scope`,
  `WorkspaceShell`.

- [ ] **Step 1: Write a failing e2e spec**, following the setup in
  `src/test/e2e/performance.spec.ts`.
  - Seed lead L (with `isTeamLead`), member M with a sale, and outsider O.
  - Sign in as L. The nav shows "My team". `/en/creator/team` lists M and not
    O. Clicking M opens the member page with M's product row.
  - `/en/creator/team/<O.id>` returns 404.
  - Sign in as M: there is no "My team" nav item, and `/en/creator/team`
    returns 404.
- [ ] **Step 2:** Run `pnpm test:e2e src/test/e2e/team-leads.spec.ts`.
  Expected: FAIL.
- [ ] **Step 3: Implement the pages.**
  - Both pages are guarded like `creator/earnings/page.tsx`. Anonymous viewers
    are redirected to sign-in. A `wrong_capability` or `not_found` result calls
    `notFound()`. A query that fails `parseAdminPerformanceQuery` renders the
    same "Invalid report filters" block as
    `admin-performance-page.tsx`.
  - The list page has an explicit empty state ("No team members yet" / "გუნდის
    წევრები ჯერ არ არიან") when `members` is empty.
  - Finance is read for the ids of the report's rows (list) or for `[memberId]`
    (member page).
- [ ] **Step 4:** Rerun the e2e spec. Expected: PASS.
- [ ] **Step 5: Full verification.** Run `pnpm typecheck && pnpm lint &&
  pnpm verify:boundaries && pnpm test:unit && pnpm test:integration`.
  Expected: everything passes.
- [ ] **Step 6: Commit.** Message: `feat: team lead My team pages`.
