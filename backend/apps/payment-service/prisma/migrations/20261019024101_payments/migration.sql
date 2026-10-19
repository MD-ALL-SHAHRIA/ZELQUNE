-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'BKASH_MANUAL', 'NAGAD_MANUAL');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('ADVANCE', 'FULL', 'COD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'REJECTED', 'COD_PENDING', 'COD_CONFIRMED', 'COLLECTED', 'VOID');

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_code" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amount_paisa" INTEGER NOT NULL,
    "trx_id" TEXT,
    "voided_trx_id" TEXT,
    "payer_phone" TEXT,
    "amount_received_paisa" INTEGER,
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ(3),
    "rejection_reason" TEXT,
    "void_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_status_changes" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "from" "PaymentStatus",
    "to" "PaymentStatus" NOT NULL,
    "actor" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_trx_id_key" ON "payments"("trx_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payment_status_changes_payment_id_idx" ON "payment_status_changes"("payment_id");

-- AddForeignKey
ALTER TABLE "payment_status_changes" ADD CONSTRAINT "payment_status_changes_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Money integrity and one open payment per order (not expressible in Prisma schema)
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive" CHECK ("amount_paisa" > 0);
CREATE UNIQUE INDEX "payments_one_open_per_order" ON "payments" ("order_id") WHERE "status" NOT IN ('VOID', 'REJECTED');
