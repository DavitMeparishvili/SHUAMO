// Only the selected locale marketing copy crosses into the client shell.
export const MARKETING_KEYS = [
  "nav.how",
  "nav.brands",
  "nav.creators",
  "nav.faq",
  "nav.language",
  "nav.primary",
  "footer.products",
  "footer.brands",
  "getStarted",
  "dashboard",
  "footer.description",
  "footer.tagline",
  "footer.platform",
  "footer.explore",
  "footer.creators",
  "signIn",
  "footer.resources",
  "footer.faq",
  "footer.policiesPending",
  "footer.copyright",
  "nav.title",
  "nav.close",
  "nav.destinations",
] as const;

export type MarketingCopy = Record<(typeof MARKETING_KEYS)[number], string>;
