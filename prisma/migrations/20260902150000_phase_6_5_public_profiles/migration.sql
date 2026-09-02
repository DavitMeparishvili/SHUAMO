CREATE TYPE "ProfileStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "brand_profile" (
  "id" UUID NOT NULL, "brand_id" UUID NOT NULL, "slug" TEXT NOT NULL,
  "status" "ProfileStatus" NOT NULL DEFAULT 'DRAFT',
  "tagline_ka" TEXT NOT NULL DEFAULT '', "tagline_en" TEXT NOT NULL DEFAULT '',
  "description_ka" TEXT NOT NULL DEFAULT '', "description_en" TEXT NOT NULL DEFAULT '',
  "location_ka" TEXT NOT NULL DEFAULT '', "location_en" TEXT NOT NULL DEFAULT '',
  "logo_url" TEXT NOT NULL DEFAULT '', "hero_image_url" TEXT NOT NULL DEFAULT '',
  "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "what_we_make" JSONB NOT NULL DEFAULT '[]',
  "collaboration_interests" JSONB NOT NULL DEFAULT '[]', "social_links" JSONB NOT NULL DEFAULT '[]',
  "featured_product_ids" JSONB NOT NULL DEFAULT '[]', "published_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "brand_profile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "brand_profile_slug_check" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 50),
  CONSTRAINT "brand_profile_categories_check" CHECK (cardinality(categories) <= 5),
  CONSTRAINT "brand_profile_publication_check" CHECK ((status = 'PUBLISHED') = (published_at IS NOT NULL))
);
CREATE TABLE "creator_profile" (
  "id" UUID NOT NULL, "creator_id" UUID NOT NULL, "slug" TEXT NOT NULL,
  "status" "ProfileStatus" NOT NULL DEFAULT 'DRAFT',
  "tagline_ka" TEXT NOT NULL DEFAULT '', "tagline_en" TEXT NOT NULL DEFAULT '',
  "description_ka" TEXT NOT NULL DEFAULT '', "description_en" TEXT NOT NULL DEFAULT '',
  "location_ka" TEXT NOT NULL DEFAULT '', "location_en" TEXT NOT NULL DEFAULT '',
  "hero_image_url" TEXT NOT NULL DEFAULT '', "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "content_formats" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "social_links" JSONB NOT NULL DEFAULT '[]', "featured_work" JSONB NOT NULL DEFAULT '[]',
  "published_at" TIMESTAMPTZ(6), "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "creator_profile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "creator_profile_slug_check" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 50),
  CONSTRAINT "creator_profile_categories_check" CHECK (cardinality(categories) <= 5),
  CONSTRAINT "creator_profile_publication_check" CHECK ((status = 'PUBLISHED') = (published_at IS NOT NULL))
);
CREATE UNIQUE INDEX "brand_profile_brand_id_key" ON "brand_profile"("brand_id");
CREATE UNIQUE INDEX "brand_profile_slug_key" ON "brand_profile"("slug");
CREATE INDEX "brand_profile_public_idx" ON "brand_profile"("status", "slug");
CREATE UNIQUE INDEX "creator_profile_creator_id_key" ON "creator_profile"("creator_id");
CREATE UNIQUE INDEX "creator_profile_slug_key" ON "creator_profile"("slug");
CREATE INDEX "creator_profile_public_idx" ON "creator_profile"("status", "slug");
ALTER TABLE "brand_profile" ADD CONSTRAINT "brand_profile_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "creator_profile" ADD CONSTRAINT "creator_profile_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
