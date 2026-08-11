-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CleaningRequestStatus" AS ENUM ('NEW', 'REVIEWING', 'CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('HOUSE', 'APARTMENT', 'OFFICE', 'COMMERCIAL', 'AIRBNB', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkerType" AS ENUM ('CREW', 'CONTRACTOR');

-- CreateTable
CREATE TABLE "CleaningService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CleaningService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningExtra" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CleaningExtra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "type" "WorkerType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "propertyType" "PropertyType",
    "bedroomCount" INTEGER,
    "startingPrice" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(4,1),
    "approximateSquareFeet" INTEGER,
    "preferredDate" TIMESTAMP(3) NOT NULL,
    "preferredTimeWindow" TEXT NOT NULL,
    "estimatedPrice" DECIMAL(10,2) NOT NULL,
    "confirmedPrice" DECIMAL(10,2),
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "status" "CleaningRequestStatus" NOT NULL DEFAULT 'NEW',
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CleaningRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningRequestExtra" (
    "id" TEXT NOT NULL,
    "cleaningRequestId" TEXT NOT NULL,
    "cleaningExtraId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CleaningRequestExtra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningAssignment" (
    "id" TEXT NOT NULL,
    "cleaningRequestId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CleaningAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CleaningService_slug_key" ON "CleaningService"("slug");
CREATE INDEX "CleaningService_isActive_displayOrder_idx" ON "CleaningService"("isActive", "displayOrder");
CREATE INDEX "CleaningExtra_isActive_displayOrder_idx" ON "CleaningExtra"("isActive", "displayOrder");
CREATE INDEX "Worker_type_isActive_idx" ON "Worker"("type", "isActive");
CREATE INDEX "Worker_lastName_firstName_idx" ON "Worker"("lastName", "firstName");
CREATE INDEX "PricingRule_propertyType_bedroomCount_isActive_idx" ON "PricingRule"("propertyType", "bedroomCount", "isActive");
CREATE UNIQUE INDEX "CleaningRequest_requestNumber_key" ON "CleaningRequest"("requestNumber");
CREATE INDEX "CleaningRequest_status_createdAt_idx" ON "CleaningRequest"("status", "createdAt");
CREATE INDEX "CleaningRequest_preferredDate_idx" ON "CleaningRequest"("preferredDate");
CREATE INDEX "CleaningRequest_scheduledStart_idx" ON "CleaningRequest"("scheduledStart");
CREATE INDEX "CleaningRequest_customerEmail_idx" ON "CleaningRequest"("customerEmail");
CREATE INDEX "CleaningRequest_customerPhone_idx" ON "CleaningRequest"("customerPhone");
CREATE INDEX "CleaningRequest_serviceId_idx" ON "CleaningRequest"("serviceId");
CREATE INDEX "CleaningRequestExtra_cleaningExtraId_idx" ON "CleaningRequestExtra"("cleaningExtraId");
CREATE UNIQUE INDEX "CleaningRequestExtra_cleaningRequestId_cleaningExtraId_key" ON "CleaningRequestExtra"("cleaningRequestId", "cleaningExtraId");
CREATE INDEX "CleaningAssignment_workerId_assignedAt_idx" ON "CleaningAssignment"("workerId", "assignedAt");
CREATE INDEX "CleaningAssignment_cleaningRequestId_idx" ON "CleaningAssignment"("cleaningRequestId");
CREATE UNIQUE INDEX "CleaningAssignment_cleaningRequestId_workerId_key" ON "CleaningAssignment"("cleaningRequestId", "workerId");

-- AddForeignKey
ALTER TABLE "CleaningRequest" ADD CONSTRAINT "CleaningRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "CleaningService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CleaningRequestExtra" ADD CONSTRAINT "CleaningRequestExtra_cleaningRequestId_fkey" FOREIGN KEY ("cleaningRequestId") REFERENCES "CleaningRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CleaningRequestExtra" ADD CONSTRAINT "CleaningRequestExtra_cleaningExtraId_fkey" FOREIGN KEY ("cleaningExtraId") REFERENCES "CleaningExtra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CleaningAssignment" ADD CONSTRAINT "CleaningAssignment_cleaningRequestId_fkey" FOREIGN KEY ("cleaningRequestId") REFERENCES "CleaningRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CleaningAssignment" ADD CONSTRAINT "CleaningAssignment_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
