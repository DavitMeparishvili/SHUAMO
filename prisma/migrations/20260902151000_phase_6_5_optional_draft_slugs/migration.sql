ALTER TABLE "brand_profile" ALTER COLUMN "slug" DROP NOT NULL;
ALTER TABLE "creator_profile" ALTER COLUMN "slug" DROP NOT NULL;
ALTER TABLE "brand_profile" DROP CONSTRAINT "brand_profile_slug_check";
ALTER TABLE "brand_profile" ADD CONSTRAINT "brand_profile_slug_check" CHECK (slug IS NULL OR (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 50));
ALTER TABLE "creator_profile" DROP CONSTRAINT "creator_profile_slug_check";
ALTER TABLE "creator_profile" ADD CONSTRAINT "creator_profile_slug_check" CHECK (slug IS NULL OR (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 50));
