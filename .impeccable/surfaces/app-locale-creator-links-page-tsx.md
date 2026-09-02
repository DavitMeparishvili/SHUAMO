---
version: 1
slug: "app-locale-creator-links-page-tsx"
primary_target: "app/[locale]/creator/links/page.tsx"
related_targets: ["src/modules/partnerships/ui/link-list.tsx","src/modules/design-system/ui/copy-field.tsx"]
---

# Creator tracking links

- Scope: the creator tracking-link catalog at `app/[locale]/creator/links/page.tsx`. Mode: Operate.
- Audience and job: approved creators identify the exact product behind each link, open its product detail, or copy the tracking URL without confusing those actions.
- Direction: Active Product Gallery, selected from seed `de440c92`. The surface uses the creator Products catalog language with a product-first 4:3 gallery, restrained card chrome, and a compact link utility footer. Approved comp: `.impeccable/mocks/decision/creator-links-gallery.png`.
- Navigation contract: the complete product area routes to `/{locale}/creator/products/{productId}`. Copy is a separate 44px control and never opens the product or tracking destination.
- Discovery contract: fixed product-type tabs plus URL-backed search, brand, resolved link status, sorting, and six-item database pagination. Empty and no-match states are distinct.
- Identification contract: real product imagery is used when available. A missing image uses a factual brand, type, SKU, and no-image fallback rather than invented product imagery. Brand, title, commission, resolved status, and accepted terms remain visible on the card.
- Constraints: Georgian and English parity, WCAG 2.2 AA, no horizontal page or utility overflow, no hover-only information, and full Copy and View product labels at desktop and mobile widths.
