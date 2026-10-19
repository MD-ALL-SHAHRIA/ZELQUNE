-- CreateEnum
CREATE TYPE "TrackedEventType" AS ENUM ('VIEW', 'ADD_TO_CART', 'CHECKOUT', 'PURCHASE');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('B2C', 'B2B');

-- CreateTable
CREATE TABLE "tracked_events" (
    "id" UUID NOT NULL,
    "type" "TrackedEventType" NOT NULL,
    "session_id" TEXT,
    "product_id" UUID,
    "variant_id" UUID,
    "order_id" UUID,
    "experiment_key" TEXT,
    "channel" "Channel" NOT NULL DEFAULT 'B2C',
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "path" TEXT,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracked_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_facts" (
    "order_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "channel" "Channel" NOT NULL DEFAULT 'B2C',
    "sale_mode" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "status_changed_at" TIMESTAMPTZ(3),
    "customer_key" TEXT,
    "total_paisa" INTEGER NOT NULL DEFAULT 0,
    "advance_required_paisa" INTEGER NOT NULL DEFAULT 0,
    "advance_verified_paisa" INTEGER NOT NULL DEFAULT 0,
    "experiment_key" TEXT,
    "session_id" TEXT,
    "utm_source" TEXT,
    "utm_campaign" TEXT,
    "placed_at" TIMESTAMPTZ(3),
    "confirmed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "order_facts_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "customer_flags" (
    "customer_key" TEXT NOT NULL,
    "is_friend" BOOLEAN NOT NULL,
    "changed_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_flags_pkey" PRIMARY KEY ("customer_key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "source" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "changes" JSONB,
    "request_id" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracked_events_type_occurred_at_idx" ON "tracked_events"("type", "occurred_at");

-- CreateIndex
CREATE INDEX "tracked_events_session_id_idx" ON "tracked_events"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "tracked_events_order_id_type_key" ON "tracked_events"("order_id", "type");

-- CreateIndex
CREATE INDEX "order_facts_placed_at_idx" ON "order_facts"("placed_at");

-- CreateIndex
CREATE INDEX "order_facts_confirmed_at_idx" ON "order_facts"("confirmed_at");

-- CreateIndex
CREATE INDEX "order_facts_customer_key_idx" ON "order_facts"("customer_key");

-- CreateIndex
CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs"("occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

