-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMPTZ(3),
ADD COLUMN     "signupDepartment" VARCHAR(120);

-- AlterTable
ALTER TABLE "EmailDelivery" ADD COLUMN     "signupVerificationId" UUID;

-- CreateTable
CREATE TABLE "SignupVerification" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "lastRequestedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SignupVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceImageContent" (
    "imageId" UUID NOT NULL,
    "bytes" BYTEA NOT NULL,

    CONSTRAINT "ResourceImageContent_pkey" PRIMARY KEY ("imageId")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignupVerification_email_key" ON "SignupVerification"("email");

-- CreateIndex
CREATE INDEX "SignupVerification_expiresAt_idx" ON "SignupVerification"("expiresAt");

-- CreateIndex
CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmailDelivery_signupVerificationId_idx" ON "EmailDelivery"("signupVerificationId");

-- AddForeignKey
ALTER TABLE "ResourceImageContent" ADD CONSTRAINT "ResourceImageContent_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "ResourceImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_signupVerificationId_fkey" FOREIGN KEY ("signupVerificationId") REFERENCES "SignupVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

