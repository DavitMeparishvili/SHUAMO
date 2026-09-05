---
version: 1
slug: "app-locale-sign-up-page-tsx"
primary_target: "app/[locale]/sign-up/page.tsx"
related_targets:
  [
    "src/modules/identity/ui/registration-form.tsx",
    "src/modules/shell/ui/site-frame.tsx",
    "app/xurjin.css",
  ]
---

# Xurjin staged registration

- Scope: seller and creator onboarding. Mode: Operate with the reference marketing frame.
- Direction: both roles share a continuous navy globe background, photographic story panel and white form card. Switching role must not introduce a pale lower background or a separate header background. Role tabs and Account, Channels, Profile, Review steps orient the applicant.
- Progression: validate the current stage before advancing; preserve field values across stages. Previous returns to earlier fields. Review displays submitted values and actual social URLs, never the password.
- Validation: localized, field-associated errors identify the repair; focus moves to the failed control or new stage heading. The numbered ordered stepper exposes the current step. Native controls retain required and invalid states.
- Product truth: final submission creates the authentication account when needed, submits a pending application and draft profile, then shows review-pending copy. Administrator approval gates marketplace access; draft profiles do not publish automatically.
- Responsive contract: hide the supporting photographic story below 1050px and stack fields at mobile widths. The form remains the primary task; both locales retain the same type hierarchy.
- Evidence: source extraction; this brief does not claim completed browser validation.
