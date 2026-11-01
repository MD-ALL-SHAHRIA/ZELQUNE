-- AlterTable
ALTER TABLE "orders" ADD COLUMN "customer_user_id" UUID;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN "customer_user_id" UUID;

-- CreateIndex
CREATE INDEX "orders_customer_user_id_created_at_idx" ON "orders"("customer_user_id", "created_at");

-- CreateIndex
CREATE INDEX "quotes_customer_user_id_created_at_idx" ON "quotes"("customer_user_id", "created_at");
