CREATE TYPE "ProductType" AS ENUM (
  'BEAUTY_FRAGRANCE', 'BEAUTY_SKINCARE', 'BEAUTY_MAKEUP',
  'FASHION_CLOTHING', 'FASHION_SHOES', 'FASHION_ACCESSORIES',
  'HOME_DECOR', 'HOME_FRAGRANCE', 'FOOD_BEVERAGE', 'ELECTRONICS',
  'HEALTH_WELLNESS', 'SPORTS_OUTDOORS', 'BABY_KIDS',
  'BOOKS_STATIONERY', 'OTHER'
);

CREATE TYPE "AffiliatePayoutTiming" AS ENUM (
  'AFTER_CONFIRMED_CONVERSION', 'MONTHLY', 'CUSTOM'
);

ALTER TABLE "product"
  ADD COLUMN "product_type" "ProductType" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "cookie_window_days" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "payout_timing" "AffiliatePayoutTiming" NOT NULL DEFAULT 'AFTER_CONFIRMED_CONVERSION',
  ADD COLUMN "allowed_channels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "prohibited_promotion_methods" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "available_regions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "coupon_policy" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "return_policy" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "content_requirements" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "special_terms" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "offer_starts_at" TIMESTAMPTZ(6),
  ADD COLUMN "offer_ends_at" TIMESTAMPTZ(6),
  ADD COLUMN "terms_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "terms_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD CONSTRAINT "product_cookie_window_valid" CHECK (cookie_window_days BETWEEN 1 AND 3650),
  ADD CONSTRAINT "product_terms_version_valid" CHECK (terms_version >= 1),
  ADD CONSTRAINT "product_offer_dates_valid" CHECK (offer_ends_at IS NULL OR offer_starts_at IS NULL OR offer_ends_at > offer_starts_at);

UPDATE "product"
SET "product_type" = CASE
  WHEN sku LIKE 'AROMA-%' THEN 'BEAUTY_FRAGRANCE'::"ProductType"
  WHEN sku LIKE 'CANDLE-%' THEN 'HOME_FRAGRANCE'::"ProductType"
  ELSE 'OTHER'::"ProductType"
END;

CREATE INDEX "product_discovery_idx"
  ON "product" ("status", "product_type", "created_at" DESC);

ALTER TABLE "tracking_link"
  ADD COLUMN "accepted_terms" JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN "terms_accepted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION prevent_tracking_link_agreement_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.product_id IS DISTINCT FROM OLD.product_id
     OR NEW.creator_id IS DISTINCT FROM OLD.creator_id
     OR NEW.code IS DISTINCT FROM OLD.code
     OR NEW.commission_type IS DISTINCT FROM OLD.commission_type
     OR NEW.commission_value IS DISTINCT FROM OLD.commission_value
     OR NEW.accepted_terms IS DISTINCT FROM OLD.accepted_terms
     OR NEW.terms_accepted_at IS DISTINCT FROM OLD.terms_accepted_at THEN
    RAISE EXCEPTION 'tracking link identity and accepted terms are immutable';
  END IF;
  RETURN NEW;
END;
$$;
