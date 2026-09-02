BEGIN;

-- Snapshot every duplicate before changing it. This materialized audit report
-- deliberately survives the migration and preserves the original order and
-- commission values for financial review.
CREATE MATERIALIZED VIEW "attribution_duplicate_click_audit" AS
WITH candidates AS (
  SELECT
    a.id AS attribution_id,
    a.click_id,
    ci.conversion_id,
    cv.order_id,
    a.creator_id,
    a.product_id,
    a.commission_amount,
    a.created_at,
    (
      c.brand_id = cv.brand_id
      AND tl.creator_id = a.creator_id
      AND tl.product_id = a.product_id
      AND p.sku = ci.sku
    ) AS is_valid,
    COUNT(*) OVER (PARTITION BY a.click_id) AS duplicate_count
  FROM attribution a
  JOIN click c ON c.id = a.click_id
  JOIN tracking_link tl ON tl.id = c.tracking_link_id
  JOIN product p ON p.id = a.product_id
  JOIN conversion_item ci ON ci.id = a.conversion_item_id
  JOIN conversion cv ON cv.id = ci.conversion_id
), ranked AS (
  SELECT
    candidates.*,
    FIRST_VALUE(attribution_id) OVER (
      PARTITION BY click_id
      ORDER BY CASE WHEN is_valid THEN 0 ELSE 1 END, created_at, attribution_id
    ) AS canonical_attribution_id
  FROM candidates
)
SELECT
  CURRENT_TIMESTAMP AS audited_at,
  click_id,
  attribution_id,
  conversion_id,
  order_id,
  creator_id,
  product_id,
  commission_amount,
  created_at,
  is_valid,
  canonical_attribution_id,
  duplicate_count
FROM ranked
WHERE duplicate_count > 1;

CREATE UNIQUE INDEX "attribution_duplicate_click_audit_attribution_key"
  ON "attribution_duplicate_click_audit" ("attribution_id");
CREATE INDEX "attribution_duplicate_click_audit_click_idx"
  ON "attribution_duplicate_click_audit" ("click_id");

CREATE TYPE "AttributionStatus" AS ENUM
  ('CANONICAL', 'NONCANONICAL', 'MANUAL_REVIEW');

ALTER TABLE "attribution"
  ADD COLUMN "historical_click_id" text,
  ADD COLUMN "canonical_attribution_id" uuid,
  ADD COLUMN "status" "AttributionStatus" NOT NULL DEFAULT 'CANONICAL',
  ADD COLUMN "resolution_note" text,
  ALTER COLUMN "click_id" DROP NOT NULL;

-- The old model legitimately wrote one attribution per matching line. Rank
-- valid records first, then preserve the earliest valid attribution/order.
CREATE TEMPORARY TABLE "_attribution_resolution" ON COMMIT DROP AS
WITH candidates AS (
  SELECT
    a.id AS attribution_id,
    a.click_id,
    ci.conversion_id,
    a.creator_id,
    a.product_id,
    a.commission_amount,
    a.created_at,
    (
      c.brand_id = cv.brand_id
      AND tl.creator_id = a.creator_id
      AND tl.product_id = a.product_id
      AND p.sku = ci.sku
    ) AS is_valid
  FROM attribution a
  JOIN click c ON c.id = a.click_id
  JOIN tracking_link tl ON tl.id = c.tracking_link_id
  JOIN product p ON p.id = a.product_id
  JOIN conversion_item ci ON ci.id = a.conversion_item_id
  JOIN conversion cv ON cv.id = ci.conversion_id
), ranked AS (
  SELECT
    candidates.*,
    ROW_NUMBER() OVER (
      PARTITION BY click_id
      ORDER BY CASE WHEN is_valid THEN 0 ELSE 1 END, created_at, attribution_id
    ) AS click_rank
  FROM candidates
), resolved AS (
  SELECT
    ranked.*,
    FIRST_VALUE(attribution_id) OVER (
      PARTITION BY click_id ORDER BY click_rank
    ) AS canonical_attribution_id,
    FIRST_VALUE(conversion_id) OVER (
      PARTITION BY click_id ORDER BY click_rank
    ) AS canonical_conversion_id,
    FIRST_VALUE(creator_id) OVER (
      PARTITION BY click_id ORDER BY click_rank
    ) AS canonical_creator_id,
    FIRST_VALUE(product_id) OVER (
      PARTITION BY click_id ORDER BY click_rank
    ) AS canonical_product_id,
    BOOL_OR(NOT is_valid) OVER (PARTITION BY click_id) AS has_invalid_record
  FROM ranked
), candidate_orders AS (
  SELECT conversion_id, COUNT(DISTINCT click_id) AS click_count
  FROM resolved
  WHERE click_rank = 1
  GROUP BY conversion_id
)
SELECT
  resolved.*,
  (
    NOT is_valid
    OR has_invalid_record
    OR candidate_orders.click_count > 1
  ) AS requires_manual_review
FROM resolved
JOIN candidate_orders
  ON candidate_orders.conversion_id = resolved.canonical_conversion_id;

DROP TRIGGER IF EXISTS "attribution_amount_immutable" ON "attribution";

-- Consolidate old same-click/same-order line commissions into the retained
-- canonical row. The materialized audit above keeps every original amount.
WITH totals AS (
  SELECT
    r.canonical_attribution_id,
    SUM(r.commission_amount) AS commission_amount
  FROM "_attribution_resolution" r
  WHERE r.conversion_id = r.canonical_conversion_id
    AND r.is_valid
    AND r.creator_id = r.canonical_creator_id
    AND r.product_id = r.canonical_product_id
  GROUP BY r.canonical_attribution_id
)
UPDATE attribution a
SET commission_amount = totals.commission_amount
FROM totals
WHERE a.id = totals.canonical_attribution_id;

UPDATE attribution a
SET
  status = CASE
    WHEN r.requires_manual_review THEN 'MANUAL_REVIEW'::"AttributionStatus"
    ELSE 'CANONICAL'::"AttributionStatus"
  END,
  resolution_note = CASE
    WHEN r.requires_manual_review THEN 'existing_business_data_requires_manual_resolution'
    WHEN EXISTS (
      SELECT 1 FROM "_attribution_resolution" sibling
      WHERE sibling.click_id = r.click_id AND sibling.click_rank > 1
    ) THEN 'earliest_valid_attribution_retained'
    ELSE NULL
  END
FROM "_attribution_resolution" r
WHERE a.id = r.canonical_attribution_id;

UPDATE attribution a
SET
  historical_click_id = a.click_id,
  click_id = NULL,
  canonical_attribution_id = r.canonical_attribution_id,
  status = 'NONCANONICAL',
  resolution_note = CASE
    WHEN r.conversion_id = r.canonical_conversion_id
      THEN 'same_order_line_attribution_consolidated'
    ELSE 'later_order_attribution_rejected'
  END
FROM "_attribution_resolution" r
WHERE a.id = r.attribution_id
  AND r.click_rank > 1;

DROP INDEX IF EXISTS "attribution_click_idx";
CREATE UNIQUE INDEX "attribution_click_id_key" ON "attribution" ("click_id");
CREATE INDEX "attribution_historical_click_idx"
  ON "attribution" ("historical_click_id");
CREATE INDEX "attribution_canonical_idx"
  ON "attribution" ("canonical_attribution_id");

ALTER TABLE "attribution"
  ADD CONSTRAINT "attribution_status_click_consistency" CHECK (
    (
      status IN ('CANONICAL', 'MANUAL_REVIEW')
      AND click_id IS NOT NULL
      AND historical_click_id IS NULL
      AND canonical_attribution_id IS NULL
    ) OR (
      status = 'NONCANONICAL'
      AND click_id IS NULL
      AND historical_click_id IS NOT NULL
      AND canonical_attribution_id IS NOT NULL
    )
  );

CREATE TRIGGER attribution_amount_immutable
BEFORE UPDATE ON "attribution"
FOR EACH ROW
EXECUTE FUNCTION prevent_attribution_amount_update();

COMMIT;
