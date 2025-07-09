-- AlterTable
ALTER TABLE "PendingVideo" ADD COLUMN     "paymentPayload" JSONB,
ADD COLUMN     "paymentRequirements" JSONB,
ADD COLUMN     "paymentSettled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentSettledAt" TIMESTAMP(3);
