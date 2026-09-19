-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FACULTY', 'STAFF', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ROOM', 'HALL', 'LABORATORY', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES', 'CANCELLED', 'EXPIRED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('PENDING', 'APPROVED', 'CANCELLED', 'EXPIRED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ResourceBlockType" AS ENUM ('MAINTENANCE', 'COLLEGE_EVENT', 'HOLIDAY', 'EMERGENCY', 'OTHER');

-- CreateTable
CREATE TABLE "Department" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "departmentId" UUID,
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "lastUsedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "type" "ResourceType" NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT NOT NULL,
    "building" VARCHAR(120) NOT NULL,
    "location" VARCHAR(180) NOT NULL,
    "capacity" INTEGER,
    "totalQuantity" INTEGER NOT NULL DEFAULT 1,
    "isExclusive" BOOLEAN NOT NULL DEFAULT true,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "instructions" TEXT,
    "advanceBookingDays" INTEGER NOT NULL DEFAULT 60,
    "minimumNoticeHours" INTEGER NOT NULL DEFAULT 1,
    "maximumDurationMinutes" INTEGER NOT NULL DEFAULT 480,
    "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
    "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "cancellationDeadlineHours" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceImage" (
    "id" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" VARCHAR(255),
    "altText" VARCHAR(255) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" UUID NOT NULL,
    "referenceCode" VARCHAR(24) NOT NULL,
    "requesterId" UUID NOT NULL,
    "departmentId" UUID,
    "title" VARCHAR(180) NOT NULL,
    "purpose" TEXT NOT NULL,
    "expectedPeople" INTEGER,
    "notes" TEXT,
    "recurrenceRule" JSONB,
    "status" "ReservationStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMPTZ(3),
    "holdExpiresAt" TIMESTAMPTZ(3),
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewedById" UUID,
    "decisionReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationOccurrence" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "blockedStartAt" TIMESTAMPTZ(3) NOT NULL,
    "blockedEndAt" TIMESTAMPTZ(3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isExclusive" BOOLEAN NOT NULL DEFAULT true,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'PENDING',
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelledById" UUID,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ReservationOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceBlock" (
    "id" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "type" "ResourceBlockType" NOT NULL,
    "reason" TEXT NOT NULL,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ResourceBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "ipAddress" VARCHAR(45),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE INDEX "Department_isActive_idx" ON "Department"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_slug_key" ON "Resource"("slug");

-- CreateIndex
CREATE INDEX "Resource_type_status_idx" ON "Resource"("type", "status");

-- CreateIndex
CREATE INDEX "Resource_building_idx" ON "Resource"("building");

-- CreateIndex
CREATE INDEX "ResourceImage_resourceId_sortOrder_idx" ON "ResourceImage"("resourceId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_referenceCode_key" ON "Reservation"("referenceCode");

-- CreateIndex
CREATE INDEX "Reservation_requesterId_status_idx" ON "Reservation"("requesterId", "status");

-- CreateIndex
CREATE INDEX "Reservation_departmentId_idx" ON "Reservation"("departmentId");

-- CreateIndex
CREATE INDEX "Reservation_status_submittedAt_idx" ON "Reservation"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "Reservation_status_holdExpiresAt_idx" ON "Reservation"("status", "holdExpiresAt");

-- CreateIndex
CREATE INDEX "ReservationOccurrence_resourceId_startAt_endAt_idx" ON "ReservationOccurrence"("resourceId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "ReservationOccurrence_resourceId_status_idx" ON "ReservationOccurrence"("resourceId", "status");

-- CreateIndex
CREATE INDEX "ReservationOccurrence_reservationId_status_idx" ON "ReservationOccurrence"("reservationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationOccurrence_reservationId_sequenceNumber_key" ON "ReservationOccurrence"("reservationId", "sequenceNumber");

-- CreateIndex
CREATE INDEX "ResourceBlock_resourceId_startAt_endAt_idx" ON "ResourceBlock"("resourceId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceImage" ADD CONSTRAINT "ResourceImage_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationOccurrence" ADD CONSTRAINT "ReservationOccurrence_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationOccurrence" ADD CONSTRAINT "ReservationOccurrence_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationOccurrence" ADD CONSTRAINT "ReservationOccurrence_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceBlock" ADD CONSTRAINT "ResourceBlock_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceBlock" ADD CONSTRAINT "ResourceBlock_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CampusReserve database-level reservation protection

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "ReservationOccurrence"
ADD CONSTRAINT "ReservationOccurrence_valid_time_range"
CHECK ("startAt" < "endAt");

ALTER TABLE "ReservationOccurrence"
ADD CONSTRAINT "ReservationOccurrence_valid_blocked_range"
CHECK (
  "blockedStartAt" <= "startAt"
  AND "blockedEndAt" >= "endAt"
  AND "blockedStartAt" < "blockedEndAt"
);

ALTER TABLE "ReservationOccurrence"
ADD CONSTRAINT "ReservationOccurrence_positive_quantity"
CHECK ("quantity" > 0);

ALTER TABLE "ReservationOccurrence"
ADD CONSTRAINT "ReservationOccurrence_exclusive_no_overlap"
EXCLUDE USING GIST (
  "resourceId" WITH =,
  tstzrange("blockedStartAt", "blockedEndAt", '[)') WITH &&
)
WHERE (
  "isExclusive" = true
  AND "status" IN ('PENDING', 'APPROVED')
);