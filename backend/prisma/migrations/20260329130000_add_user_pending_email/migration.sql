-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pendingEmail" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_pendingEmail_key" ON "users"("pendingEmail");
