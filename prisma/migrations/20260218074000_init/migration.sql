-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('Bank', 'Hedge Fund', 'Asset Manager', 'Recruiter Firm', 'Other');

-- CreateEnum
CREATE TYPE "ContactCategory" AS ENUM ('Sales', 'Trading', 'Structuring', 'Investment', 'HR', 'Recruiter', 'Other');

-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('Analyst', 'Associate', 'VP', 'Director', 'MD', 'Partner', 'HR', 'Recruiter', 'Other');

-- CreateEnum
CREATE TYPE "InteractionGlobalCategory" AS ENUM ('Sales', 'Trading', 'Structuring', 'Investment', 'Other');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('Official Application', 'LinkedIn Message', 'Cold Email', 'Call', 'Referral');

-- CreateEnum
CREATE TYPE "InteractionStatus" AS ENUM ('Sent', 'Waiting', 'Follow-up', 'Interview', 'Offer', 'Rejected', 'Closed');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('Low', 'Medium', 'High');

-- CreateEnum
CREATE TYPE "Outcome" AS ENUM ('None', 'Rejected', 'Interview', 'Offer');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CompanyType" NOT NULL DEFAULT 'Other',
    "main_location" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "exact_title" TEXT,
    "category" "ContactCategory",
    "seniority" "Seniority",
    "location" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedin_url" TEXT,
    "manager_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "role_title" TEXT,
    "global_category" "InteractionGlobalCategory",
    "type" "InteractionType",
    "status" "InteractionStatus" NOT NULL DEFAULT 'Sent',
    "priority" "Priority",
    "date_sent" DATE,
    "last_update" DATE,
    "next_follow_up_date" DATE,
    "outcome" "Outcome",
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "companies_user_id_idx" ON "companies"("user_id");

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_email_key" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_user_id_idx" ON "contacts"("user_id");

-- CreateIndex
CREATE INDEX "contacts_company_id_idx" ON "contacts"("company_id");

-- CreateIndex
CREATE INDEX "contacts_manager_id_idx" ON "contacts"("manager_id");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "interactions_user_id_idx" ON "interactions"("user_id");

-- CreateIndex
CREATE INDEX "interactions_company_id_idx" ON "interactions"("company_id");

-- CreateIndex
CREATE INDEX "interactions_contact_id_idx" ON "interactions"("contact_id");

-- CreateIndex
CREATE INDEX "interactions_status_idx" ON "interactions"("status");

-- CreateIndex
CREATE INDEX "interactions_date_sent_idx" ON "interactions"("date_sent" DESC);

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
