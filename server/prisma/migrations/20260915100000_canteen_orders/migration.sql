ALTER TYPE "UserRole" ADD VALUE 'CANTEEN_STAFF';

CREATE TYPE "CanteenItemStatus" AS ENUM ('AVAILABLE', 'SOLD_OUT', 'INACTIVE');
CREATE TYPE "CanteenOrderStatus" AS ENUM ('PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'REJECTED', 'CANCELLED');
CREATE TYPE "CanteenPaymentMethod" AS ENUM ('UPI', 'CASH_ON_DELIVERY');
CREATE TYPE "CanteenPaymentStatus" AS ENUM ('PENDING_VERIFICATION', 'PAY_ON_DELIVERY', 'PAID', 'VERIFICATION_FAILED');

CREATE TABLE "CanteenItem" (
  "id" UUID NOT NULL, "name" VARCHAR(120) NOT NULL, "description" TEXT NOT NULL,
  "category" VARCHAR(80) NOT NULL, "pricePaise" INTEGER NOT NULL, "imageUrl" TEXT,
  "options" TEXT[] DEFAULT ARRAY[]::TEXT[], "status" "CanteenItemStatus" NOT NULL DEFAULT 'AVAILABLE',
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "CanteenItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CanteenOrder" (
  "id" UUID NOT NULL, "referenceCode" VARCHAR(24) NOT NULL, "requesterId" UUID NOT NULL, "handlerId" UUID,
  "status" "CanteenOrderStatus" NOT NULL DEFAULT 'PENDING', "paymentMethod" "CanteenPaymentMethod" NOT NULL,
  "paymentStatus" "CanteenPaymentStatus" NOT NULL, "upiReference" VARCHAR(80), "paymentScreenshotUrl" TEXT,
  "deliveryLocation" VARCHAR(220) NOT NULL, "deliveryAt" TIMESTAMPTZ(3) NOT NULL, "notes" TEXT, "rejectionReason" TEXT,
  "totalPaise" INTEGER NOT NULL, "acceptedAt" TIMESTAMPTZ(3), "deliveredAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "CanteenOrder_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CanteenOrderItem" (
  "id" UUID NOT NULL, "orderId" UUID NOT NULL, "itemId" UUID NOT NULL, "itemName" VARCHAR(120) NOT NULL,
  "unitPricePaise" INTEGER NOT NULL, "quantity" INTEGER NOT NULL, "customization" VARCHAR(160), "lineTotalPaise" INTEGER NOT NULL,
  CONSTRAINT "CanteenOrderItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CanteenOrder_referenceCode_key" ON "CanteenOrder"("referenceCode");
CREATE INDEX "CanteenItem_status_category_sortOrder_idx" ON "CanteenItem"("status", "category", "sortOrder");
CREATE INDEX "CanteenOrder_requesterId_createdAt_idx" ON "CanteenOrder"("requesterId", "createdAt");
CREATE INDEX "CanteenOrder_status_deliveryAt_idx" ON "CanteenOrder"("status", "deliveryAt");
CREATE INDEX "CanteenOrder_handlerId_status_idx" ON "CanteenOrder"("handlerId", "status");
CREATE INDEX "CanteenOrderItem_orderId_idx" ON "CanteenOrderItem"("orderId");
CREATE INDEX "CanteenOrderItem_itemId_idx" ON "CanteenOrderItem"("itemId");
ALTER TABLE "CanteenOrder" ADD CONSTRAINT "CanteenOrder_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CanteenOrder" ADD CONSTRAINT "CanteenOrder_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CanteenOrderItem" ADD CONSTRAINT "CanteenOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CanteenOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanteenOrderItem" ADD CONSTRAINT "CanteenOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CanteenItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
