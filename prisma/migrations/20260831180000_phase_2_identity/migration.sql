-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "app_user" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ka',
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "app_user_locale_check" CHECK ("locale" IN ('ka', 'en'))
);

CREATE TABLE "brand" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "vat_registered" BOOLEAN NOT NULL DEFAULT false,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "creator" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "payout_bank" TEXT,
    "payout_iban" TEXT,
    "payout_name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "creator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "session" (
    "id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" UUID NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "account" (
    "id" UUID NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMPTZ(6),
    "refresh_token_expires_at" TIMESTAMPTZ(6),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");
CREATE UNIQUE INDEX "brand_user_id_key" ON "brand"("user_id");
CREATE UNIQUE INDEX "brand_key_prefix_key" ON "brand"("key_prefix");
CREATE UNIQUE INDEX "creator_user_id_key" ON "creator"("user_id");
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");
CREATE INDEX "session_user_id_idx" ON "session"("user_id");
CREATE INDEX "account_user_id_idx" ON "account"("user_id");
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

ALTER TABLE "brand" ADD CONSTRAINT "brand_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "creator" ADD CONSTRAINT "creator_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
