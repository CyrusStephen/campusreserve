-- Additive migration: preserves existing users, sessions, venues and bookings.
BEGIN;
ALTER TABLE "Resource"
  ADD COLUMN "tourUrl" TEXT,
  ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "Resource_isDemo_status_idx" ON "Resource"("isDemo", "status");

ALTER TABLE "Resource" ADD CONSTRAINT "Resource_revision_positive" CHECK ("revision" > 0);
COMMIT;
