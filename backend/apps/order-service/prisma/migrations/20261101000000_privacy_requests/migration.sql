-- CreateEnum
CREATE TYPE "PrivacyRequestType" AS ENUM ('ACCESS', 'CORRECTION', 'DELETION', 'CONSENT_WITHDRAWAL');

-- CreateEnum
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('PENDING', 'VERIFICATION_REQUIRED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "privacy_requests" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "type" "PrivacyRequestType" NOT NULL,
    "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "phone" TEXT NOT NULL,
    "phone_key" TEXT NOT NULL,
    "email" TEXT,
    "reference" TEXT,
    "reference_matched" BOOLEAN NOT NULL DEFAULT false,
    "details" TEXT NOT NULL DEFAULT '',
    "verification_method" TEXT,
    "verification_note" TEXT,
    "verified_at" TIMESTAMPTZ(3),
    "verified_by" TEXT,
    "decision_note" TEXT,
    "result" JSONB,
    "resolved_at" TIMESTAMPTZ(3),
    "resolved_by" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "privacy_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "privacy_requests_code_key" ON "privacy_requests"("code");

-- CreateIndex
CREATE INDEX "privacy_requests_status_created_at_idx" ON "privacy_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "privacy_requests_phone_key_type_status_idx" ON "privacy_requests"("phone_key", "type", "status");
