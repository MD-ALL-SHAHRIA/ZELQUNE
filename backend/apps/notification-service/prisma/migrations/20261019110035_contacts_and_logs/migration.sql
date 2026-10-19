-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "order_contacts" (
    "order_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "sale_mode" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "total_paisa" INTEGER NOT NULL,
    "advance_required_paisa" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_contacts_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "template" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'SMS',
    "recipient" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_ref" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_logs_recipient_idx" ON "notification_logs"("recipient");

-- CreateIndex
CREATE UNIQUE INDEX "notification_logs_event_id_template_key" ON "notification_logs"("event_id", "template");

