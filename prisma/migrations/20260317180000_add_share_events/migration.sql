-- CreateEnum
CREATE TYPE "ShareType" AS ENUM ('COPY_LINK', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "ShareResourceType" AS ENUM ('VIDEO', 'PROFILE');

-- CreateTable
CREATE TABLE "ShareEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "shareType" "ShareType" NOT NULL,
    "resourceType" "ShareResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShareEvent_userId_idx" ON "ShareEvent"("userId");

-- CreateIndex
CREATE INDEX "ShareEvent_resourceType_resourceId_idx" ON "ShareEvent"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ShareEvent_createdAt_idx" ON "ShareEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "ShareEvent" ADD CONSTRAINT "ShareEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
