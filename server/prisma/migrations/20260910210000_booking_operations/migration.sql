CREATE TYPE "WaitlistStatus" AS ENUM ('ACTIVE', 'CLAIMED', 'EXPIRED', 'CANCELLED', 'FULFILLED');

CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

ALTER TABLE "Reservation"
  ADD COLUMN "assignedToName" VARCHAR(120) NOT NULL DEFAULT 'Not assigned',
  ADD COLUMN "assignedToEmail" VARCHAR(255) NOT NULL DEFAULT 'unknown@example.invalid',
  ADD COLUMN "assignedToPhone" VARCHAR(30) NOT NULL DEFAULT 'Not provided';

UPDATE "Reservation" AS r
SET "assignedToName" = u."name",
    "assignedToEmail" = u."email",
    "assignedToPhone" = 'Not provided'
FROM "User" AS u
WHERE u."id" = r."requesterId";

ALTER TABLE "Reservation"
  ALTER COLUMN "assignedToName" DROP DEFAULT,
  ALTER COLUMN "assignedToEmail" DROP DEFAULT,
  ALTER COLUMN "assignedToPhone" DROP DEFAULT;

CREATE TABLE "WaitlistEntry" (
  "id" UUID NOT NULL,
  "requesterId" UUID NOT NULL,
  "resourceId" UUID NOT NULL,
  "startAt" TIMESTAMPTZ(3) NOT NULL,
  "endAt" TIMESTAMPTZ(3) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "status" "WaitlistStatus" NOT NULL DEFAULT 'ACTIVE',
  "notifiedAt" TIMESTAMPTZ(3),
  "claimExpiresAt" TIMESTAMPTZ(3),
  "claimedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailDelivery" (
  "id" UUID NOT NULL,
  "to" VARCHAR(255) NOT NULL,
  "subject" VARCHAR(255) NOT NULL,
  "textBody" TEXT NOT NULL,
  "htmlBody" TEXT,
  "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" VARCHAR(500),
  "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMPTZ(3),
  "sentAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WaitlistEntry_resourceId_startAt_endAt_status_idx" ON "WaitlistEntry"("resourceId", "startAt", "endAt", "status");
CREATE INDEX "WaitlistEntry_requesterId_status_createdAt_idx" ON "WaitlistEntry"("requesterId", "status", "createdAt");
CREATE INDEX "EmailDelivery_status_nextAttemptAt_idx" ON "EmailDelivery"("status", "nextAttemptAt");
CREATE INDEX "EmailDelivery_createdAt_idx" ON "EmailDelivery"("createdAt");

ALTER TABLE "WaitlistEntry"
  ADD CONSTRAINT "WaitlistEntry_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WaitlistEntry"
  ADD CONSTRAINT "WaitlistEntry_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
