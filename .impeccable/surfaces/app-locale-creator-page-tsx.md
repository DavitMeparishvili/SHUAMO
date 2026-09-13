---
version: 1
slug: "app-locale-creator-page-tsx"
primary_target: "app/[locale]/creator/page.tsx"
related_targets:
  [
    "app/[locale]/brand/page.tsx",
    "src/modules/conversions/ui/workspace-overview.tsx",
    "src/modules/shell/ui/site-frame.tsx",
  ]
---

# Xurjin role dashboards

- Scope: creator and seller overview dashboards and their shared workspace shell. Mode: Operate.
- Direction: user reference dashboard world with a fixed navy identity/account rail, white topbar, pale working canvas, white metric cards, product modules, activity, chart panels and soft action panels.
- Metrics: four linked overview cards show recorded values. Trends and product distribution derive from the report; absent activity has explanatory empty states. Comparison text is displayed only when corresponding report data exists.
- Product modules: thumbnail, product facts, stored commission and current link state lead into the appropriate real product or tracking-link action. Images come from owner-supplied records with a factual fallback.
- Attribution: preserve exact source-ledger links and distinguish confirmed, cancelled and unattributed records. A successful sale earns eligible commission automatically; brands do not approve individual sales. Confirmed does not imply paid.
- Planned features: messages and other unavailable capabilities use visible Coming soon labels and a designed unavailable-feature destination. Unknown locale-scoped routes and errors use Xurjin recovery surfaces.
- Responsive contract: the rail collapses at 1050px to a named native dialog and navy bottom navigation; the X mark remains visible in the mobile top bar. Metrics use two columns at 720px and charts/content stack. No source facts are removed to fit.
- Shared shell proportions: both roles use a 244px rail (220px below 1250px), stable scrollbar space, and a 78px logo/header row. At 720px and below, every workspace uses the same 68px header with centered branding. Five equal mobile navigation columns reserve two lines for translated labels and always include More; the page reserves the navigation height plus the device safe area. Page styles must not override shell dimensions.
- Evidence: source extraction with review artifacts in .impeccable/review/xurjin; final browser status is maintained separately.
