---
version: 1
slug: "app-locale-brand-settings-page-tsx"
primary_target: "app/[locale]/brand/settings/page.tsx"
related_targets:
  [
    "src/modules/conversions/ui/integration-guide.tsx",
    "src/modules/conversions/ui/integration-tools.tsx",
    "src/modules/conversions/ui/integration-copy.ts",
    "src/modules/identity/ui/brand-key-generator.tsx",
    "app/integration.css",
  ]
---

# Brand integration guide

- Mode: Read, with operational key and validation controls. Approved brand
  developers learn the referral-to-sale contract and diagnose an implementation.
- Direction: preserve the established Xurjin workspace, typography and palette.
  A single reading column contains ordered integration steps, copyable code,
  reference tables, a session validator and real request history. A sticky local
  contents navigation sits to the right on desktop and precedes content on mobile.
- First viewport: the integration purpose and four-step flow explain store and
  Xurjin responsibilities. No connection badge or fabricated progress indicator.
- Interaction: code-language selection exposes pressed state; copying reports
  success/failure. Key rotation requires explicit confirmation after warning of
  immediate invalidation. The key prefix is informational, not a copyable secret.
- Validation: current-data preview with clear attribution reasons and no sales
  or commission writes. The session validator explicitly does not prove that a
  developer's backend credentials or referral capture work. Real API validation
  uses the server-side Bearer key. Results and errors use live status regions.
- Request history: latest 20 real brand-scoped requests with mode, HTTP status,
  timestamp and expandable request ID/explanation. Empty and unavailable states
  are explicit. No payloads or secrets appear in the history.
- Responsive and accessibility: Georgian and English share hierarchy and wrapping
  space. Code and reference tables have contained keyboard-accessible scrolling.
  The content fits a 390px viewport. Desktop English and mobile Georgian main
  content passed the WCAG-tagged axe checks via Playwright MCP.
- Evidence: source implementation and Playwright MCP screenshots in the ignored
  `.playwright-mcp/integration-desktop.png` and `integration-mobile.png` artifacts.
