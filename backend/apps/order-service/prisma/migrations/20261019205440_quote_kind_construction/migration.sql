-- AlterEnum
ALTER TYPE "QuoteKind" ADD VALUE 'CONSTRUCTION';

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "design_floors" INTEGER;


-- Leads (DESIGN, CONSTRUCTION) describe the space; written without naming the new enum value,
-- which Postgres does not allow in the transaction that adds it.
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_kind_fields_check";
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_kind_fields_check" CHECK (
  ("kind" = 'PRODUCT' AND "organization_name" IS NOT NULL)
  OR ("kind" <> 'PRODUCT' AND "design_space_type" IS NOT NULL)
);
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_design_floors_check"
  CHECK ("design_floors" IS NULL OR "design_floors" BETWEEN 1 AND 60);
