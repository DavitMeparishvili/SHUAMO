# Brand product editor validation

The editor follows the supplied Xurjin Product Editor Guide and the two Add/Edit reference boards. The later requested public-gallery change adds previous/next arrows only when multiple images exist.

## Implementation

- One shared Add/Edit form with section anchors, numbered terms accordions, a sticky desktop creator preview, and a mobile jump selector/full-screen preview/fixed action bar.
- All existing fields and schema semantics remain available, including optional description, all channel/restriction selections, ISO regions, dates, and four-decimal fixed commissions.
- Add mode uses a signed, brand-bound upload namespace. No product is created until publication. Save verifies new objects exist, have an accepted content type, and are at most 5 MB. Image removal/order/primary changes remain unsaved until a successful write.
- Server-confirmed saves preserve state on failure, disable duplicate submissions, return inline validation, and replace the creation URL after success. A history sentinel protects browser Back independently of the Navigation API. Leaving through links/sign-out and browser unload also checks unsaved changes.
- Archive has a scoped confirmation and preserves historical records. Creators & links stays in its existing separate view.
- Product rate edits increment the offered terms version. Conversion processing reads the tracking link's accepted commission rate; existing snapshots and historical conversions are unchanged.
- The existing conversion resolver enforces 30 days independently of `cookieWindowDays`. Non-30-day offered terms explicitly disclose this beside the field and in preview. This redesign does not change attribution calculations.

## Local verification

- Production build, TypeScript, scoped ESLint, and module-boundary checks passed.
- 37 focused unit tests passed, including reservation tampering/ownership/expiry and editor validation/save-state behavior.
- 16 catalog and product-link integration tests passed.
- Six Playwright regression checks passed across desktop/mobile and English/Georgian. They include browser Back with the Navigation API explicitly unavailable and axe accessibility checks with no violations.
- Playwright MCP checked 1440px and 390px in both locales with no horizontal overflow. Verified real pre-publication multi-image upload, create/edit round trips, optional description, percentage/fixed switching, saved term fields and selections, URL/rate/date/duplicate-SKU validation, primary selection, drag reorder, deferred removal, upload retry, failed-save recovery, preview, archive cancellation/confirmation, and public-gallery arrows including keyboard activation.
- Failure tests deliberately returned HTTP 500 for upload and save requests; entered fields and existing images survived, incomplete uploads blocked saving, and retries succeeded.
- Testing mutations used a dedicated local `EDITOR-QA-...` product, subsequently archived. Existing catalog products were not edited.

## Independent review

A reviewer with no inherited conversation reviewed the guide, boards, source, and EN/KA desktop/mobile screenshots. Four findings were corrected and re-reviewed: browser Back fallback, attribution-window disclosure, terms-group borders/chevrons, and amount/currency wrapping. Final disposition: **Accepted for the reviewed scope; no outstanding findings.**

Evidence is under `.impeccable/review/editor-*.png` and `gallery-arrows-*.png`.

## Product details follow-up (local)

- Brand catalogue photo/title links now open the same product ID on the shared details page. Only the owning approved brand sees Edit product; the editor includes View product with unsaved-change protection. Brand Back controls and the shell breadcrumb return to the brand catalogue on desktop/mobile.
- Archived details are available only to the approved owning brand, with an explicit notice. Anonymous viewers, creators, other brands, and suspended owners cannot retrieve them. Public active-product visibility and creator accepted terms remain unchanged.
- The two reported URLs identify different records: `e2bd4814-eb99-4bdc-b255-d3b0a83f2cd1` is the archived three-image QA product; `32000000-0000-4000-8000-000000000001` has one image. Gallery arrows correctly appear only for multiple images. No images were copied between products.
- Fresh reviewer with no inherited conversation found no critical/high issues. Its mobile Back destination finding was fixed and accepted on re-review; final disposition has no unresolved findings.
- Production build, scoped ESLint, module boundaries and 12 focused product-link integration tests passed. All 16 detail/editor browser checks passed across desktop/mobile; the 10 checks touching product details passed again after final CSS adjustments. Axe reported no violations in the tested surfaces.
- Playwright MCP verified owner catalogue/details/editor/return navigation in EN/KA at 1440px and 390px, next/previous/wraparound/keyboard/lightbox image controls, single-image arrow absence, and creator/anonymous access restrictions. Separate mobile touch contexts verified taps on catalogue entries, arrows, Edit, View product and Back in both languages. Georgian details/editor also passed a 320px overflow check.
- Final screenshots: `.impeccable/review/owner-details-{en,ka}-{1440,390}.png` and `owner-editor-{en,ka}-{1440,390}.png`. The Georgian mobile Edit action was given the available width to avoid unnecessary wrapping. The design hook's existing 30px mobile commission value was corrected to the documented 28px step; no findings were suppressed or left standing.

## Deployment status

Production deployment is postponed at the user's request. Post-deployment Playwright MCP verification remains for that deployment. Local verification above is not a production verification claim.
