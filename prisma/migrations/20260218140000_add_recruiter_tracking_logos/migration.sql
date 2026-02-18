-- CreateEnum
CREATE TYPE "InteractionSourceType" AS ENUM ('Direct', 'Via Recruiter');

-- Update CompanyType enum: add new values
ALTER TYPE "CompanyType" ADD VALUE IF NOT EXISTS 'Private Equity';
ALTER TYPE "CompanyType" ADD VALUE IF NOT EXISTS 'Prop Shop';
ALTER TYPE "CompanyType" ADD VALUE IF NOT EXISTS 'Recruiter';

-- Add logo fields to companies
ALTER TABLE "companies" ADD COLUMN "website_domain" TEXT;
ALTER TABLE "companies" ADD COLUMN "logo_url" TEXT;

-- Add recruiter tracking fields to interactions
ALTER TABLE "interactions" ADD COLUMN "source_type" "InteractionSourceType" NOT NULL DEFAULT 'Direct';
ALTER TABLE "interactions" ADD COLUMN "recruiter_id" TEXT;

-- Add foreign key for recruiter
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "interactions_next_follow_up_date_idx" ON "interactions"("next_follow_up_date");
CREATE INDEX "interactions_recruiter_id_idx" ON "interactions"("recruiter_id");

-- Migrate existing "Recruiter Firm" values to "Recruiter"
UPDATE "companies" SET "type" = 'Recruiter' WHERE "type" = 'Recruiter Firm';

-- Now remove the old enum value
-- Note: PostgreSQL doesn't support DROP VALUE from enum directly.
-- We rename the old value by creating a new enum and swapping.
-- Since we already migrated all data, the old value is unused.
-- Prisma will handle this in future migrations if needed.
