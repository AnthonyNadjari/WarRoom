-- AlterTable: add parent_interaction_id and updated_at to interactions
ALTER TABLE "interactions" ADD COLUMN "parent_interaction_id" TEXT;
ALTER TABLE "interactions" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "interactions_parent_interaction_id_idx" ON "interactions"("parent_interaction_id");

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_parent_interaction_id_fkey" FOREIGN KEY ("parent_interaction_id") REFERENCES "interactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
