UPDATE "product" SET "image_urls" = ARRAY[]::TEXT[] WHERE "image_urls" IS NULL;
ALTER TABLE "product" ALTER COLUMN "image_urls" SET NOT NULL;
