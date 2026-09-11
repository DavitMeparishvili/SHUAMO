CREATE TABLE "integration_request" (
  "id" uuid PRIMARY KEY,
  "brand_id" uuid NOT NULL REFERENCES "brand"("id") ON DELETE CASCADE,
  "mode" text NOT NULL CHECK ("mode" IN ('live', 'validation')),
  "status" integer NOT NULL CHECK ("status" BETWEEN 100 AND 599),
  "outcome" text NOT NULL,
  "at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "integration_request_brand_at_idx" ON "integration_request" ("brand_id", "at" DESC);
