import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { TransactionBuilder } from './transactions';
import { ReadMethods } from './read';
import { PDAHelper } from './pda-helpers';

// Re-export types and utilities
export * from './types';
export * from './utils';
export { PDAHelper } from './pda-helpers';

export class CertificationSDK {
  private program?: Program;
  private idl?: Idl;
  private txBuilder?: TransactionBuilder;
  private readMethods: ReadMethods;
  private pdaHelper: PDAHelper;

  constructor(
    private connection: Connection,
    idl?: Idl
  ) {
    this.readMethods = new ReadMethods(connection);
    this.pdaHelper = new PDAHelper();

    if (idl) {
      this.initializeWithIdl(idl);
    }
  }

  // Initialize with IDL (for backend)
  initializeWithIdl(idl: Idl) {
    this.idl = idl;
    const dummyWallet = {
      publicKey: PublicKey.default,
      signTransaction: async (tx: Transaction) => tx,
      signAllTransactions: async (txs: Transaction[]) => txs,
    } as AnchorWallet;

    const provider = new AnchorProvider(
      this.connection,
      dummyWallet,
      AnchorProvider.defaultOptions()
    );
    this.program = new Program(idl, provider);
    this.txBuilder = new TransactionBuilder(this.program, this.connection);
  }

  private ensureProgram() {
    if (!this.program || !this.txBuilder) {
      throw new Error('Program not initialized. Call initializeWithIdl first.');
    }
  }

  // ============================================================================
  // PDA HELPERS - Exposed for convenience
  // ============================================================================

  getCompanyPDA(companyId: string): [PublicKey, number] {
    return this.pdaHelper.getCompanyPDA(companyId);
  }

  // NEW: Pending Transfer PDA
  getPendingTransferPDA(companyPubkey: PublicKey): [PublicKey, number] {
    return this.pdaHelper.getPendingTransferPDA(companyPubkey);
  }

  getEmployeePDA(
    companyPubkey: PublicKey,
    employeeWallet: PublicKey
  ): [PublicKey, number] {
    return this.pdaHelper.getEmployeePDA(companyPubkey, employeeWallet);
  }

  getCertificatePDA(
    companyPubkey: PublicKey,
    certificateId: string
  ): [PublicKey, number] {
    return this.pdaHelper.getCertificatePDA(companyPubkey, certificateId);
  }

  getTemplatePDA(
    companyPubkey: PublicKey,
    templateId: string
  ): [PublicKey, number] {
    return this.pdaHelper.getTemplatePDA(companyPubkey, templateId);
  }

  getAwardTypePDA(
    companyPubkey: PublicKey,
    awardTypeId: string
  ): [PublicKey, number] {
    return this.pdaHelper.getAwardTypePDA(companyPubkey, awardTypeId);
  }

  getAwardPDA(companyPubkey: PublicKey, awardId: string): [PublicKey, number] {
    return this.pdaHelper.getAwardPDA(companyPubkey, awardId);
  }

  getAwardMintPDA(
    companyPubkey: PublicKey,
    awardId: string
  ): [PublicKey, number] {
    return this.pdaHelper.getAwardMintPDA(companyPubkey, awardId);
  }

  // ============================================================================
  // TRANSACTION BUILDERS
  // ============================================================================

  // --- Company ---

  async buildInitializeCompanyTx(
    companyId: string,
    companyDetails: string,
    authorityPubkey: PublicKey
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildInitializeCompanyTx(
      companyId,
      companyDetails,
      authorityPubkey
    );
  }

  async buildUpdateCompanyTx(
    companyPubkey: PublicKey,
    authorityPubkey: PublicKey,
    updates: {
      companyDetails?: string;
      isActive?: boolean;
    }
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildUpdateCompanyTx(
      companyPubkey,
      authorityPubkey,
      updates
    );
  }

  // --- Authority Transfer (NEW) ---

  async buildProposeTransferAuthorityTx(
    companyPubkey: PublicKey,
    currentAuthority: PublicKey,
    newAuthority: PublicKey
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildProposeTransferAuthorityTx(
      companyPubkey,
      currentAuthority,
      newAuthority
    );
  }

  async buildAcceptTransferAuthorityTx(
    companyPubkey: PublicKey,
    newAuthority: PublicKey,
    oldAuthority: PublicKey
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildAcceptTransferAuthorityTx(
      companyPubkey,
      newAuthority,
      oldAuthority
    );
  }

  async buildCancelTransferAuthorityTx(
    companyPubkey: PublicKey,
    currentAuthority: PublicKey
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildCancelTransferAuthorityTx(
      companyPubkey,
      currentAuthority
    );
  }

  // --- Employee ---

  async buildAddEmployeeTx(
    companyId: string,
    employeeWallet: PublicKey,
    employeeDetails: string,
    companyAuthorityPubkey: PublicKey
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildAddEmployeeTx(
      companyId,
      employeeWallet,
      employeeDetails,
      companyAuthorityPubkey
    );
  }

  async buildConfirmEmployeeTx(
    companyPubkey: PublicKey,
    employeeWalletPubkey: PublicKey
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildConfirmEmployeeTx(
      companyPubkey,
      employeeWalletPubkey
    );
  }

  async buildUpdateEmployeeStatusTx(
    companyPubkey: PublicKey,
    employeePubkey: PublicKey,
    newStatus: number,
    companyAuthorityPubkey: PublicKey
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildUpdateEmployeeStatusTx(
      companyPubkey,
      employeePubkey,
      newStatus,
      companyAuthorityPubkey
    );
  }

  async buildUpdateEmployeeTx(
    companyPubkey: PublicKey,
    employeeWalletPubkey: PublicKey,
    companyAuthorityPubkey: PublicKey,
    employeeDetails: string
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildUpdateEmployeeTx(
      companyPubkey,
      employeeWalletPubkey,
      companyAuthorityPubkey,
      employeeDetails
    );
  }

  async buildCloseEmployeeTx(
    companyPubkey: PublicKey,
    employeePubkey: PublicKey,
    authorityPubkey: PublicKey
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildCloseEmployeeTx(
      companyPubkey,
      employeePubkey,
      authorityPubkey
    );
  }

  // --- Certificate ---

  async buildIssueCertificateTx(
    companyPubkey: PublicKey,
    employeePubkey: PublicKey,
    certificateId: string,
    templateId: string,
    certificateDetails: string,
    companyAuthorityPubkey: PublicKey,
    expiresAt?: number
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildIssueCertificateTx(
      companyPubkey,
      employeePubkey,
      certificateId,
      templateId,
      certificateDetails,
      companyAuthorityPubkey,
      expiresAt
    );
  }

  async buildRevokeCertificateTx(
    companyPubkey: PublicKey,
    certificatePubkey: PublicKey,
    companyAuthorityPubkey: PublicKey
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildRevokeCertificateTx(
      companyPubkey,
      certificatePubkey,
      companyAuthorityPubkey
    );
  }

  async buildCloseCertificateTx(
    companyPubkey: PublicKey,
    certificatePubkey: PublicKey,
    authorityPubkey: PublicKey
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildCloseCertificateTx(
      companyPubkey,
      certificatePubkey,
      authorityPubkey
    );
  }

  // --- Templates ---

  async buildCreateCertificateTemplateTx(
    companyPubkey: PublicKey,
    templateId: string,
    certificateDetails: string,
    companyAuthorityPubkey: PublicKey
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildCreateCertificateTemplateTx(
      companyPubkey,
      templateId,
      certificateDetails,
      companyAuthorityPubkey
    );
  }

  async buildUpdateCertificateTemplateTx(
    companyPubkey: PublicKey,
    templatePubkey: PublicKey,
    certificateDetails: string,
    companyAuthorityPubkey: PublicKey
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildUpdateCertificateTemplateTx(
      companyPubkey,
      templatePubkey,
      certificateDetails,
      companyAuthorityPubkey
    );
  }

  // --- Awards ---

  async buildCreateAwardTypeTx(
    companyPubkey: PublicKey,
    awardTypeId: string,
    metadataUri: string,
    companyAuthorityPubkey: PublicKey
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildCreateAwardTypeTx(
      companyPubkey,
      awardTypeId,
      metadataUri,
      companyAuthorityPubkey
    );
  }

  async buildUpdateAwardTypeTx(
    companyPubkey: PublicKey,
    awardTypePubkey: PublicKey,
    updates: {
      metadataUri?: string;
      isActive?: boolean;
    },
    companyAuthorityPubkey: PublicKey
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildUpdateAwardTypeTx(
      companyPubkey,
      awardTypePubkey,
      updates,
      companyAuthorityPubkey
    );
  }

  async buildMintAwardNftTx(
    companyPubkey: PublicKey,
    employeePubkey: PublicKey,
    employeeWalletPubkey: PublicKey,
    awardTypePubkey: PublicKey,
    awardId: string,
    companyAuthorityPubkey: PublicKey,
    name: string,
    symbol: string
  ): Promise<string> {
    this.ensureProgram();
    return this.txBuilder!.buildMintAwardNFTTx(
      companyPubkey,
      employeePubkey,
      employeeWalletPubkey,
      awardTypePubkey,
      awardId,
      companyAuthorityPubkey,
      name,
      symbol
    );
  }

  // ============================================================================
  // READ METHODS
  // ============================================================================

  async getCompany(companyId: string) {
    return this.readMethods.getCompany(companyId);
  }

  async getCompanyByPubkey(companyPubkey: PublicKey) {
    return this.readMethods.getCompanyByPubkey(companyPubkey);
  }

  async getCompanyByAuthority(authority: string) {
    return this.readMethods.getCompanyByAuthority(authority);
  }

  async getPendingTransfer(companyPubkey: PublicKey) {
    return this.readMethods.getPendingTransfer(companyPubkey);
  }

  async getEmployee(companyPubkey: PublicKey, employeeWallet: PublicKey) {
    return this.readMethods.getEmployee(companyPubkey, employeeWallet);
  }

  async getEmployeeByPubkey(employeePubkey: PublicKey) {
    return this.readMethods.getEmployeeByPubkey(employeePubkey);
  }

  async getAllEmployeesOfCompany(companyPubkey: PublicKey) {
    return this.readMethods.getAllEmployeesOfCompany(companyPubkey);
  }

  async getCertificate(companyPubkey: PublicKey, certificateId: string) {
    return this.readMethods.getCertificate(companyPubkey, certificateId);
  }

  async getCertificateByPubkey(certificatePubkey: PublicKey) {
    return this.readMethods.getCertificateByPubkey(certificatePubkey);
  }

  async getAllCertificatesOfEmployee(employeePubkey: PublicKey) {
    return this.readMethods.getAllCertificatesOfEmployee(employeePubkey);
  }

  async getAllCertificatesOfCompany(companyPubkey: PublicKey) {
    return this.readMethods.getAllCertificatesOfCompany(companyPubkey);
  }

  async verifyCertificate(certificatePubkey: PublicKey) {
    return this.readMethods.verifyCertificate(certificatePubkey);
  }

  async isValidCertificate(certificatePubkey: PublicKey) {
    return this.readMethods.isValidCertificate(certificatePubkey);
  }

  async findCertificateById(certificateId: string) {
    return this.readMethods.findCertificateById(certificateId);
  }

  async debugAllCertificates() {
    return this.readMethods.debugAllCertificates();
  }

  async getTemplate(companyPubkey: PublicKey, templateId: string) {
    return this.readMethods.getTemplate(companyPubkey, templateId);
  }

  async getTemplateByPubkey(templatePubkey: PublicKey) {
    return this.readMethods.getTemplateByPubkey(templatePubkey);
  }

  async getAllTemplatesOfCompany(companyPubkey: PublicKey) {
    return this.readMethods.getAllTemplatesOfCompany(companyPubkey);
  }

  async getAwardType(companyPubkey: PublicKey, awardTypeId: string) {
    return this.readMethods.getAwardType(companyPubkey, awardTypeId);
  }

  async getAwardTypeByPubkey(awardTypePubkey: PublicKey) {
    return this.readMethods.getAwardTypeByPubkey(awardTypePubkey);
  }

  async getAllAwardTypesOfCompany(companyPubkey: PublicKey) {
    return this.readMethods.getAllAwardTypesOfCompany(companyPubkey);
  }

  async getAward(companyPubkey: PublicKey, awardId: string) {
    return this.readMethods.getAward(companyPubkey, awardId);
  }

  async getAwardByPubkey(awardPubkey: PublicKey) {
    return this.readMethods.getAwardByPubkey(awardPubkey);
  }

  async getAllAwardsOfEmployee(employeePubkey: PublicKey) {
    return this.readMethods.getAllAwardsOfEmployee(employeePubkey);
  }

  async getAllAwardsOfCompany(companyPubkey: PublicKey) {
    return this.readMethods.getAllAwardsOfCompany(companyPubkey);
  }

  async getAllAwardsByType(awardTypePubkey: PublicKey) {
    return this.readMethods.getAllAwardsByType(awardTypePubkey);
  }
}

/**
 * Create SDK instance for backend (no wallet needed)
 */
export function createCertificationSDK(
  connection: Connection,
  idl: Idl
): CertificationSDK {
  return new CertificationSDK(connection, idl);
}