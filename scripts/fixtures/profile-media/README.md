# Profile and product review images

Local demonstration assets for Nino, Aromashop and all seven seeded products.
These are illustrative stand-ins, not photographs of the actual test accounts,
their work or their inventory. Stock locations outside Georgia illustrate the
portfolio themes only. See `sources.json` for original URLs and credits.
Third-party product photographs are included for the requested local test use;
replace them with owner-supplied media before publishing a real catalogue.

`aromashop-logo.svg` is an original botanical monogram for this fictional seed
identity; `aromashop-logo.jpg` is its raster upload counterpart.

Run `pnpm seed:media` to refresh only image fields in the existing development
data. It preserves profile text, publication state, products, terms and links.
The Phase 6.5 seed also applies these images after creating its fixtures.
Both commands upload the checked-in JPEGs to the configured S3-compatible
storage, so rendering and reseeding do not depend on external image hosts.
