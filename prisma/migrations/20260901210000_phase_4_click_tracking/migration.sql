CREATE TABLE "click" (
    "id" TEXT NOT NULL,
    "tracking_link_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "visitor_id" UUID,
    "fp_hash" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creditable" BOOLEAN NOT NULL DEFAULT true,
    "converted_at" TIMESTAMPTZ(6),
    CONSTRAINT "click_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "click_candidates_idx" ON "click" ("brand_id", "visitor_id", "occurred_at" DESC)
    WHERE "creditable";
CREATE INDEX "click_link_idx" ON "click" ("tracking_link_id", "occurred_at" DESC);
CREATE INDEX "click_fp_dedup_idx" ON "click" ("tracking_link_id", "fp_hash", "occurred_at" DESC)
    WHERE "fp_hash" IS NOT NULL;
CREATE INDEX "click_converted_idx" ON "click" ("tracking_link_id")
    WHERE "converted_at" IS NOT NULL;

ALTER TABLE "click" ADD CONSTRAINT "click_tracking_link_id_fkey"
    FOREIGN KEY ("tracking_link_id") REFERENCES "tracking_link"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "click" ADD CONSTRAINT "click_brand_id_fkey"
    FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
