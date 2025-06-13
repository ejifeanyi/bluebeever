-- AlterTable
ALTER TABLE "emails" ADD COLUMN     "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processingStatus" TEXT;

-- CreateIndex
CREATE INDEX "emails_isRead_idx" ON "emails"("isRead");

-- CreateIndex
CREATE INDEX "emails_processingStatus_idx" ON "emails"("processingStatus");
