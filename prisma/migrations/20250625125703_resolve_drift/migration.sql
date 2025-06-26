-- CreateTable
CREATE TABLE "NotificationToken" (
    "id" TEXT NOT NULL,
    "fid" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationToken_fid_key" ON "NotificationToken"("fid");

-- AlterTable
ALTER TABLE "Video" ADD COLUMN "videoUrl" TEXT; 