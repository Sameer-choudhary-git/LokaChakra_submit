-- CreateTable
CREATE TABLE "transaction_logs" (
    "id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "programId" TEXT NOT NULL,
    "instruction" TEXT,
    "eventName" TEXT,
    "eventData" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdTxSignature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "companyPublicKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdTxSignature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "companyPublicKey" TEXT NOT NULL,
    "employeePublicKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "issuedTxSignature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_templates" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "companyPublicKey" TEXT NOT NULL,
    "createdTxSignature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "award_types" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "awardTypeId" TEXT NOT NULL,
    "companyPublicKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdTxSignature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "award_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "awards" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "awardId" TEXT NOT NULL,
    "companyPublicKey" TEXT NOT NULL,
    "employeePublicKey" TEXT NOT NULL,
    "awardTypePublicKey" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "mintedTxSignature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "awards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_logs_signature_key" ON "transaction_logs"("signature");

-- CreateIndex
CREATE INDEX "transaction_logs_programId_timestamp_idx" ON "transaction_logs"("programId", "timestamp");

-- CreateIndex
CREATE INDEX "transaction_logs_eventName_timestamp_idx" ON "transaction_logs"("eventName", "timestamp");

-- CreateIndex
CREATE INDEX "transaction_logs_signature_idx" ON "transaction_logs"("signature");

-- CreateIndex
CREATE UNIQUE INDEX "companies_publicKey_key" ON "companies"("publicKey");

-- CreateIndex
CREATE INDEX "companies_publicKey_idx" ON "companies"("publicKey");

-- CreateIndex
CREATE INDEX "companies_authority_idx" ON "companies"("authority");

-- CreateIndex
CREATE UNIQUE INDEX "employees_publicKey_key" ON "employees"("publicKey");

-- CreateIndex
CREATE INDEX "employees_publicKey_idx" ON "employees"("publicKey");

-- CreateIndex
CREATE INDEX "employees_wallet_idx" ON "employees"("wallet");

-- CreateIndex
CREATE INDEX "employees_companyPublicKey_idx" ON "employees"("companyPublicKey");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_publicKey_key" ON "certificates"("publicKey");

-- CreateIndex
CREATE INDEX "certificates_publicKey_idx" ON "certificates"("publicKey");

-- CreateIndex
CREATE INDEX "certificates_companyPublicKey_idx" ON "certificates"("companyPublicKey");

-- CreateIndex
CREATE INDEX "certificates_employeePublicKey_idx" ON "certificates"("employeePublicKey");

-- CreateIndex
CREATE INDEX "certificates_status_idx" ON "certificates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_templates_publicKey_key" ON "certificate_templates"("publicKey");

-- CreateIndex
CREATE INDEX "certificate_templates_publicKey_idx" ON "certificate_templates"("publicKey");

-- CreateIndex
CREATE INDEX "certificate_templates_companyPublicKey_idx" ON "certificate_templates"("companyPublicKey");

-- CreateIndex
CREATE UNIQUE INDEX "award_types_publicKey_key" ON "award_types"("publicKey");

-- CreateIndex
CREATE INDEX "award_types_publicKey_idx" ON "award_types"("publicKey");

-- CreateIndex
CREATE INDEX "award_types_companyPublicKey_idx" ON "award_types"("companyPublicKey");

-- CreateIndex
CREATE UNIQUE INDEX "awards_publicKey_key" ON "awards"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "awards_mint_key" ON "awards"("mint");

-- CreateIndex
CREATE INDEX "awards_publicKey_idx" ON "awards"("publicKey");

-- CreateIndex
CREATE INDEX "awards_mint_idx" ON "awards"("mint");

-- CreateIndex
CREATE INDEX "awards_companyPublicKey_idx" ON "awards"("companyPublicKey");

-- CreateIndex
CREATE INDEX "awards_employeePublicKey_idx" ON "awards"("employeePublicKey");

-- CreateIndex
CREATE INDEX "awards_awardTypePublicKey_idx" ON "awards"("awardTypePublicKey");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_companyPublicKey_fkey" FOREIGN KEY ("companyPublicKey") REFERENCES "companies"("publicKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_companyPublicKey_fkey" FOREIGN KEY ("companyPublicKey") REFERENCES "companies"("publicKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_employeePublicKey_fkey" FOREIGN KEY ("employeePublicKey") REFERENCES "employees"("publicKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_companyPublicKey_fkey" FOREIGN KEY ("companyPublicKey") REFERENCES "companies"("publicKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award_types" ADD CONSTRAINT "award_types_companyPublicKey_fkey" FOREIGN KEY ("companyPublicKey") REFERENCES "companies"("publicKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_companyPublicKey_fkey" FOREIGN KEY ("companyPublicKey") REFERENCES "companies"("publicKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_employeePublicKey_fkey" FOREIGN KEY ("employeePublicKey") REFERENCES "employees"("publicKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_awardTypePublicKey_fkey" FOREIGN KEY ("awardTypePublicKey") REFERENCES "award_types"("publicKey") ON DELETE CASCADE ON UPDATE CASCADE;
