-- Idempotent follow-up for development databases that applied the attribution
-- migration while it was being reviewed. Clean deployments already have this.
ALTER TABLE "attribution" ALTER COLUMN "click_id" DROP NOT NULL;
