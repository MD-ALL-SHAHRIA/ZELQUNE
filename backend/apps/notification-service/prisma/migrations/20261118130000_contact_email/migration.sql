-- Order emails: the customer's email (optional at checkout) and ordering language. The email is
-- removed with the contact on privacy erasure.
ALTER TABLE "order_contacts" ADD COLUMN "email" TEXT;
ALTER TABLE "order_contacts" ADD COLUMN "lang" TEXT NOT NULL DEFAULT 'bn';
