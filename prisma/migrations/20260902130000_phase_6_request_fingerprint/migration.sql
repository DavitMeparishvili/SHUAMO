ALTER TABLE "conversion"
  ADD COLUMN "request_fingerprint" varchar(64);

-- Phase 6 was not released before this migration. The backfill only keeps
-- locally-created development rows valid; new intake requests always store the
-- canonical SHA-256 request fingerprint transactionally with the conversion.
UPDATE "conversion"
SET "request_fingerprint" =
  md5("id"::text || ':' || "order_id") ||
  md5("brand_id"::text || ':' || "occurred_at"::text)
WHERE "request_fingerprint" IS NULL;

ALTER TABLE "conversion"
  ALTER COLUMN "request_fingerprint" SET NOT NULL,
  ADD CONSTRAINT "conversion_request_fingerprint_sha256"
    CHECK (request_fingerprint ~ '^[0-9a-f]{64}$');
