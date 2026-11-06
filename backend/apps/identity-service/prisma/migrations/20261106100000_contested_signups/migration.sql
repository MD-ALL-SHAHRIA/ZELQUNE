-- A second sign-up for an email that is still unverified marks it contested: verifying then
-- clears the stored password and every session (audit ID-SEC-2).
ALTER TABLE "users" ADD COLUMN "signup_contested_at" TIMESTAMPTZ(3);
