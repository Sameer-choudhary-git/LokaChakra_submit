-- AlterTable
ALTER TABLE "award_types" ADD COLUMN     "metadataUri" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "awards" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "certificate_templates" ADD COLUMN     "details" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "details" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "details" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "details" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "transfer_requests" (
    "id" TEXT NOT NULL,
    "companyPublicKey" TEXT NOT NULL,
    "currentAuthority" TEXT NOT NULL,
    "newAuthority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdTxSignature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transfer_requests_companyPublicKey_idx" ON "transfer_requests"("companyPublicKey");

-- CreateIndex
CREATE INDEX "transfer_requests_status_idx" ON "transfer_requests"("status");

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_companyPublicKey_fkey" FOREIGN KEY ("companyPublicKey") REFERENCES "companies"("publicKey") ON DELETE CASCADE ON UPDATE CASCADE;
