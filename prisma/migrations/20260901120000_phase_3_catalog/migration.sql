-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "PartnershipStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "RateType" AS ENUM ('PERCENT', 'FIXED');
CREATE TYPE "LinkStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price_gel" DECIMAL(12,2) NOT NULL,
    "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "backlink_url" TEXT NOT NULL,
    "commission_type" "RateType" NOT NULL,
    "commission_value" DECIMAL(9,4) NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_price_non_negative" CHECK (price_gel >= 0),
    CONSTRAINT "product_rate_non_negative" CHECK (commission_value >= 0),
    CONSTRAINT "percent_is_fraction" CHECK (commission_type <> 'PERCENT' OR commission_value <= 1),
    CONSTRAINT "image_urls_bounded" CHECK (cardinality(image_urls) <= 8)
);

CREATE TABLE "partnership" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "status" "PartnershipStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "partnership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tracking_link" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "status" "LinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tracking_link_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_brand_id_sku_key" ON "product"("brand_id", "sku");
CREATE UNIQUE INDEX "partnership_brand_id_creator_id_key" ON "partnership"("brand_id", "creator_id");
CREATE INDEX "partnership_creator_idx" ON "partnership"("creator_id", "status");
CREATE UNIQUE INDEX "tracking_link_code_key" ON "tracking_link"("code");
CREATE UNIQUE INDEX "tracking_link_product_id_creator_id_key" ON "tracking_link"("product_id", "creator_id");
CREATE INDEX "tracking_link_creator_idx" ON "tracking_link"("creator_id");

ALTER TABLE "product" ADD CONSTRAINT "product_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partnership" ADD CONSTRAINT "partnership_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partnership" ADD CONSTRAINT "partnership_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tracking_link" ADD CONSTRAINT "tracking_link_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tracking_link" ADD CONSTRAINT "tracking_link_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
