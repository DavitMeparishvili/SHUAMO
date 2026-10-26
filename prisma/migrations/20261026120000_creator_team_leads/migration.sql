-- AlterTable
ALTER TABLE "creator"
ADD COLUMN "is_team_lead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "team_lead_id" UUID;

-- CreateIndex
CREATE INDEX "creator_team_lead_idx" ON "creator"("team_lead_id");

-- AddForeignKey
ALTER TABLE "creator" ADD CONSTRAINT "creator_team_lead_id_fkey" FOREIGN KEY ("team_lead_id") REFERENCES "creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A creator cannot be their own team lead.
ALTER TABLE "creator" ADD CONSTRAINT "creator_team_lead_not_self" CHECK ("team_lead_id" IS NULL OR "team_lead_id" <> "id");
