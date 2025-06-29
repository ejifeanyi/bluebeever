-- AlterTable
ALTER TABLE "emails" ADD COLUMN     "categorizedAt" TIMESTAMP(3),
ADD COLUMN     "category" TEXT,
ADD COLUMN     "categoryConfidence" DOUBLE PRECISION,
ADD COLUMN     "categoryDescription" TEXT,
ADD COLUMN     "isNewCategory" BOOLEAN;

-- CreateIndex
CREATE INDEX "emails_category_idx" ON "emails"("category");
