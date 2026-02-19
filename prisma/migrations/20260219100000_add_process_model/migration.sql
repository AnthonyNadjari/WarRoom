-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('Active', 'Interviewing', 'Offer', 'Rejected', 'Closed');

-- CreateTable
CREATE TABLE "processes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "role_title" TEXT NOT NULL,
    "location" TEXT,
    "status" "ProcessStatus" NOT NULL DEFAULT 'Active',
    "source_process_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processes_pkey" PRIMARY KEY ("id")
);

-- Add process_id to interactions
ALTER TABLE "interactions" ADD COLUMN "process_id" TEXT;

-- CreateIndexes
CREATE INDEX "processes_user_id_idx" ON "processes"("user_id");
CREATE INDEX "processes_company_id_idx" ON "processes"("company_id");
CREATE INDEX "processes_source_process_id_idx" ON "processes"("source_process_id");
CREATE INDEX "interactions_process_id_idx" ON "interactions"("process_id");

-- AddForeignKeys
ALTER TABLE "processes" ADD CONSTRAINT "processes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "processes" ADD CONSTRAINT "processes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "processes" ADD CONSTRAINT "processes_source_process_id_fkey" FOREIGN KEY ("source_process_id") REFERENCES "processes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
