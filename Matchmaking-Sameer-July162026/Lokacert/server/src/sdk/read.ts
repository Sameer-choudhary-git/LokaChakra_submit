import { Connection, PublicKey } from '@solana/web3.js';
import {
  CompanyData,
  EmployeeData,
  CertificateData,
  CertificateTemplateData,
  AwardTypeData,
  AwardData,
  PendingTransferData, // Import this
  CertificateStatus,
  EmployeeStatus,
  PROGRAM_ID,
} from './types';
import { TimeoutOperations } from '../utils/timeout-wrapper';
import {
  deserializeCompany,
  deserializeEmployee,
  deserializeCertificate,
  deserializeTemplate,
  deserializeAwardType,
  deserializeAward,
  deserializePendingTransfer, // Import this
} from './deserializers';
import { PDAHelper } from './pda-helpers';
import {
  AWARD_SIZE,
  AWARD_TYPE_SIZE,
  COMPANY_SIZE,
  EMPLOYEE_SIZE,
  CERTIFICATE_SIZE,
  CERTIFICATE_TEMPLATE_SIZE,
  // Make sure to add PENDING_TRANSFER_SIZE (73 bytes) to your constants!
} from '../utils/contanst'; // Typo in your filename kept as is
import { utils } from '../sdk/utils';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';

export class ReadMethods {
  private pdaHelper: PDAHelper;

  constructor(private connection: Connection) {
    this.pdaHelper = new PDAHelper();
  }

  // ============================================================================
  // COMPANY METHODS
  // ============================================================================

  async getCompanyByAuthority(authority: string): Promise<CompanyData[]> {
    const authorityPubkey = new PublicKey(authority);

    const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: COMPANY_SIZE },
        {
          memcmp: {
            offset: 8, // Skip discriminator, authority is first field
            bytes: authorityPubkey.toBase58(),
          },
        },
      ],
    });
    const companies: CompanyData[] = [];
    for (const { account } of accounts) {
      const companyData = deserializeCompany(account.data);
      companies.push(companyData);
    }
    return companies;
  }

  async getCompany(companyId: string): Promise<CompanyData | null> {
    const [companyPDA] = this.pdaHelper.getCompanyPDA(companyId);
    console.log('companyPDA:', companyPDA.toBase58());
    const accountInfo = await TimeoutOperations.blockchain.rpc(
      this.connection.getAccountInfo(companyPDA),
      'getAccountInfo.company',
      { companyId, companyPDA: companyPDA.toBase58() }
    );
    console.log('accountInfo:', accountInfo);

    if (!accountInfo) return null;
    return deserializeCompany(accountInfo.data);
  }

  async getCompanyByPubkey(
    companyPubkey: PublicKey
  ): Promise<CompanyData | null> {
    const accountInfo = await TimeoutOperations.blockchain.rpc(
      this.connection.getAccountInfo(companyPubkey),
      'getAccountInfo.companyByPubkey',
      { companyPubkey: companyPubkey.toBase58() }
    );

    if (!accountInfo) return null;
    return deserializeCompany(accountInfo.data);
  }

  // NEW: Get Pending Transfer Request
  async getPendingTransfer(
    companyPubkey: PublicKey
  ): Promise<PendingTransferData | null> {
    const [pendingPDA] = this.pdaHelper.getPendingTransferPDA(companyPubkey);
    const accountInfo = await TimeoutOperations.blockchain.rpc(
      this.connection.getAccountInfo(pendingPDA),
      'getAccountInfo.pendingTransfer',
      { companyPubkey: companyPubkey.toBase58(), pendingPDA: pendingPDA.toBase58() }
    );

    if (!accountInfo) return null;
    return deserializePendingTransfer(accountInfo.data);
  }

  // ============================================================================
  // EMPLOYEE METHODS
  // ============================================================================

  async getEmployee(
    companyPubkey: PublicKey,
    employeeWallet: PublicKey
  ): Promise<EmployeeData | null> {
    const [employeePDA] = this.pdaHelper.getEmployeePDA(
      companyPubkey,
      employeeWallet
    );
    console.log('employeePDA:', employeePDA.toBase58());
    const accountInfo = await TimeoutOperations.blockchain.rpc(
      this.connection.getAccountInfo(employeePDA),
      'getAccountInfo.employee',
      { 
        companyPubkey: companyPubkey.toBase58(),
        employeeWallet: employeeWallet.toBase58(),
        employeePDA: employeePDA.toBase58()
      }
    );

    if (!accountInfo) return null;
    return deserializeEmployee(accountInfo.data);
  }

  async getEmployeeByPubkey(
    employeePubkey: PublicKey
  ): Promise<EmployeeData | null> {
    const accountInfo = await TimeoutOperations.blockchain.rpc(
      this.connection.getAccountInfo(employeePubkey),
      'getAccountInfo.employeeByPubkey',
      { employeePubkey: employeePubkey.toBase58() }
    );

    if (!accountInfo) return null;
    return deserializeEmployee(accountInfo.data);
  }

  async getAllEmployeesOfCompany(
    companyPubkey: PublicKey
  ): Promise<Array<{ pubkey: PublicKey; data: EmployeeData }>> {
    const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: EMPLOYEE_SIZE },
        {
          memcmp: {
            offset: 8 + 32, // Discriminator (8) + Wallet (32) => Company starts at 40
            bytes: companyPubkey.toBase58(),
          },
        },
      ],
    });

    return accounts.map(({ pubkey, account }) => ({
      pubkey,
      data: deserializeEmployee(account.data),
    }));
  }

  // ============================================================================
  // CERTIFICATE METHODS
  // ============================================================================

  async getCertificate(
    companyPubkey: PublicKey,
    certificateId: string
  ): Promise<CertificateData | null> {
    const [certificatePDA] = this.pdaHelper.getCertificatePDA(
      companyPubkey,
      certificateId
    );
    const accountInfo = await this.connection.getAccountInfo(certificatePDA);

    if (!accountInfo) return null;
    return deserializeCertificate(accountInfo.data);
  }

  async getCertificateByPubkey(
    certificatePubkey: PublicKey
  ): Promise<CertificateData | null> {
    const accountInfo = await this.connection.getAccountInfo(certificatePubkey);

    if (!accountInfo) return null;
    return deserializeCertificate(accountInfo.data);
  }

  async getAllCertificatesOfEmployee(
    employeePubkey: PublicKey
  ): Promise<Array<{ pubkey: PublicKey; data: CertificateData }>> {
    const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: CERTIFICATE_SIZE },
        {
          memcmp: {
            // Cert Struct: ID(6) -> Company(32) -> Employee(32)
            // Offset = 8 + 6 + 32 = 46
            offset: 46, 
            bytes: employeePubkey.toBase58(),
          },
        },
      ],
    });

    return accounts.map(({ pubkey, account }) => ({
      pubkey,
      data: deserializeCertificate(account.data),
    }));
  }

  async getAllCertificatesOfCompany(
    companyPubkey: PublicKey
  ): Promise<Array<{ pubkey: PublicKey; data: CertificateData }>> {
    const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: CERTIFICATE_SIZE },
        {
          memcmp: {
            // Cert Struct: ID(6) -> Company(32)
            // Offset = 8 + 6 = 14
            offset: 14, 
            bytes: companyPubkey.toBase58(),
          },
        },
      ],
    });

    return accounts.map(({ pubkey, account }) => ({
      pubkey,
      data: deserializeCertificate(account.data),
    }));
  }

  async verifyCertificate(certificatePubkey: PublicKey): Promise<{
    isValid: boolean;
    certificate: CertificateData | null;
    company: CompanyData | null;
    employee: EmployeeData | null;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    const certAccount = await this.connection.getAccountInfo(certificatePubkey);
    if (!certAccount) {
      return {
        isValid: false,
        certificate: null,
        company: null,
        employee: null,
        reasons: ['Certificate not found'],
      };
    }

    const certData = deserializeCertificate(certAccount.data);
    
    console.log('🔍 DEBUG: Certificate status:', certData.status);
    console.log('🔍 DEBUG: Certificate status enum values:', {
      Active: CertificateStatus.Active,
      Revoked: CertificateStatus.Revoked,
      Expired: 2
    });

    if (certData.status === CertificateStatus.Revoked) {
      console.log('❌ DEBUG: Certificate is REVOKED');
      reasons.push('Certificate is revoked');
    }

    const now = Math.floor(Date.now() / 1000);
    if (
      certData.expiresAt.toNumber() > 0 &&
      certData.expiresAt.toNumber() < now
    ) {
      reasons.push('Certificate has expired');
    }

    // Try direct connection first, fallback to TimeoutOperations if needed
    let companyData: CompanyData | null = null;
    try {
      console.log('🔍 DEBUG: Fetching company account:', certData.company.toBase58());
      const companyAccount = await this.connection.getAccountInfo(certData.company);
      console.log('🔍 DEBUG: Company account result:', !!companyAccount);
      companyData = companyAccount ? deserializeCompany(companyAccount.data) : null;
      if (companyData) {
        console.log('✅ DEBUG: Company data loaded successfully');
      }
    } catch (error) {
      console.log('⚠️ DEBUG: Error fetching company account:', error);
      // Fallback to TimeoutOperations
      try {
        const companyAccount = await TimeoutOperations.blockchain.rpc(
          this.connection.getAccountInfo(certData.company),
          'verifyCertificate.getCompanyInfo',
          { companyPubkey: certData.company.toBase58() }
        );
        companyData = companyAccount ? deserializeCompany(companyAccount.data) : null;
      } catch (fallbackError) {
        console.log('⚠️ DEBUG: Fallback company fetch also failed:', fallbackError);
      }
    }

    if (!companyData) {
      reasons.push('Company not found');
    } else if (!companyData.isActive) {
      reasons.push('Company is not active');
    }

    // Try direct connection first, fallback to TimeoutOperations if needed
    let employeeData: EmployeeData | null = null;
    try {
      console.log('🔍 DEBUG: Fetching employee account:', certData.employee.toBase58());
      const employeeAccount = await this.connection.getAccountInfo(certData.employee);
      console.log('🔍 DEBUG: Employee account result:', !!employeeAccount);
      employeeData = employeeAccount ? deserializeEmployee(employeeAccount.data) : null;
      if (employeeData) {
        console.log('✅ DEBUG: Employee data loaded successfully');
      }
    } catch (error) {
      console.log('⚠️ DEBUG: Error fetching employee account:', error);
      // Fallback to TimeoutOperations
      try {
        const employeeAccount = await TimeoutOperations.blockchain.rpc(
          this.connection.getAccountInfo(certData.employee),
          'verifyCertificate.getEmployeeInfo',
          { employeePubkey: certData.employee.toBase58() }
        );
        employeeData = employeeAccount ? deserializeEmployee(employeeAccount.data) : null;
      } catch (fallbackError) {
        console.log('⚠️ DEBUG: Fallback employee fetch also failed:', fallbackError);
      }
    }

    if (!employeeData) {
      reasons.push('Employee not found');
    } else if (employeeData.status !== EmployeeStatus.Active) {
      reasons.push('Employee is not active');
    }

    const isValid = reasons.length === 0;

    return {
      isValid,
      certificate: certData,
      company: companyData,
      employee: employeeData,
      reasons,
    };
  }

  async isValidCertificate(certificatePubkey: PublicKey): Promise<boolean> {
    const result = await this.verifyCertificate(certificatePubkey);
    return result.isValid;
  }

  // ============================================================================
  // TEMPLATE METHODS
  // ============================================================================

  async getTemplate(
    companyPubkey: PublicKey,
    templateId: string
  ): Promise<CertificateTemplateData | null> {
    const [templatePDA] = this.pdaHelper.getTemplatePDA(
      companyPubkey,
      templateId
    );
    const accountInfo = await this.connection.getAccountInfo(templatePDA);

    if (!accountInfo) return null;
    return deserializeTemplate(accountInfo.data);
  }

  async getTemplateByPubkey(
    templatePubkey: PublicKey
  ): Promise<CertificateTemplateData | null> {
    const accountInfo = await this.connection.getAccountInfo(templatePubkey);

    if (!accountInfo) return null;
    return deserializeTemplate(accountInfo.data);
  }

  async getAllTemplatesOfCompany(
    companyPubkey: PublicKey
  ): Promise<Array<{ pubkey: PublicKey; data: CertificateTemplateData }>> {
    const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: CERTIFICATE_TEMPLATE_SIZE },
        {
          memcmp: {
            // Template Struct: ID(6) -> Company(32)
            // Offset = 8 + 6 = 14
            offset: 14,
            bytes: companyPubkey.toBase58(),
          },
        },
      ],
    });

    return accounts.map(({ pubkey, account }) => ({
      pubkey,
      data: deserializeTemplate(account.data),
    }));
  }

  // ============================================================================
  // AWARD TYPE METHODS
  // ============================================================================

  async getAwardType(
    companyPubkey: PublicKey,
    awardTypeId: string
  ): Promise<AwardTypeData | null> {
    const [awardTypePDA] = this.pdaHelper.getAwardTypePDA(
      companyPubkey,
      awardTypeId
    );
    const accountInfo = await this.connection.getAccountInfo(awardTypePDA);

    if (!accountInfo) return null;
    return deserializeAwardType(accountInfo.data);
  }

  async getAwardTypeByPubkey(
    awardTypePubkey: PublicKey
  ): Promise<AwardTypeData | null> {
    const accountInfo = await this.connection.getAccountInfo(awardTypePubkey);

    if (!accountInfo) return null;
    return deserializeAwardType(accountInfo.data);
  }

  async getAllAwardTypesOfCompany(
    companyPubkey: PublicKey
  ): Promise<Array<{ pubkey: PublicKey; data: AwardTypeData }>> {
    const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: AWARD_TYPE_SIZE },
        {
          memcmp: {
            offset: 8 + 6, // discriminator + awardTypeId
            bytes: companyPubkey.toBase58(),
          },
        },
      ],
    });

    return accounts.map(({ pubkey, account }) => ({
      pubkey,
      data: deserializeAwardType(account.data),
    }));
  }

  // ============================================================================
  // AWARD METHODS
  // ============================================================================

  async getAward(
    companyPubkey: PublicKey,
    awardId: string
  ): Promise<AwardData | null> {
    const [awardPDA] = this.pdaHelper.getAwardPDA(companyPubkey, awardId);
    const accountInfo = await this.connection.getAccountInfo(awardPDA);

    if (!accountInfo) return null;
    return deserializeAward(accountInfo.data);
  }

  async getAwardByPubkey(awardPubkey: PublicKey): Promise<AwardData | null> {
    const accountInfo = await this.connection.getAccountInfo(awardPubkey);

    if (!accountInfo) return null;
    return deserializeAward(accountInfo.data);
  }

  async getAllAwardsOfEmployee(
    employeePubkey: PublicKey
  ): Promise<Array<{ pubkey: PublicKey; data: AwardData }>> {
    const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: AWARD_SIZE },
        {
          memcmp: {
            // Award Struct: ID(6) -> Company(32) -> Employee(32)
            // Offset = 8 + 6 + 32 = 46
            offset: 46,
            bytes: employeePubkey.toBase58(),
          },
        },
      ],
    });

    return accounts.map(({ pubkey, account }) => ({
      pubkey,
      data: deserializeAward(account.data),
    }));
  }

  async getAllAwardsOfCompany(
    companyPubkey: PublicKey
  ): Promise<Array<{ pubkey: PublicKey; data: AwardData }>> {
    const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: AWARD_SIZE },
        {
          memcmp: {
             // Award Struct: ID(6) -> Company(32)
             // Offset = 8 + 6 = 14
            offset: 14,
            bytes: companyPubkey.toBase58(),
          },
        },
      ],
    });

    return accounts.map(({ pubkey, account }) => ({
      pubkey,
      data: deserializeAward(account.data),
    }));
  }

  async getAllAwardsByType(
    awardTypePubkey: PublicKey
  ): Promise<Array<{ pubkey: PublicKey; data: AwardData }>> {
    const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: AWARD_SIZE },
        {
          memcmp: {
            // Award Struct: ID(6) -> Company(32) -> Employee(32) -> Type(32)
            // Offset = 8 + 6 + 32 + 32 = 78
            offset: 78,
            bytes: awardTypePubkey.toBase58(),
          },
        },
      ],
    });

    return accounts.map(({ pubkey, account }) => ({
      pubkey,
      data: deserializeAward(account.data),
    }));
  }

  /**
   * Debug method to list all certificates and their IDs
   */
  async debugAllCertificates(): Promise<
    Array<{
      pubkey: PublicKey;
      data: CertificateData;
      certificateIdString: string;
    }>
  > {
    console.log('🔍 DEBUG: Fetching all certificates...');

    const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
      filters: [{ dataSize: CERTIFICATE_SIZE }],
    });

    console.log(`  Found ${accounts.length} total certificates`);

    return accounts.map(({ pubkey, account }) => {
      const data = deserializeCertificate(account.data);
      const certificateIdString = utils.u8Array6ToString(data.certificateId);
      console.log(
        `  Certificate: ${pubkey.toBase58()} -> ID: "${certificateIdString}" (bytes: [${data.certificateId.join(', ')}])`
      );

      return {
        pubkey,
        data,
        certificateIdString,
      };
    });
  }

  /**
   * Find certificate by certificate ID across all companies using getProgramAccounts
   */
  async findCertificateById(
    certificateId: string
  ): Promise<{ pubkey: PublicKey; data: CertificateData } | null> {
    console.log('🔍 Searching for certificate ID:', certificateId);
    const certificateIdBytes = utils.stringToU8Array6(certificateId);
    
    const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: CERTIFICATE_SIZE },
        {
          memcmp: {
            offset: 8, // Skip discriminator, certificateId is first field
            bytes: bs58.encode(Buffer.from(certificateIdBytes)),
          },
        },
      ],
    });

    if (accounts.length === 0) {
      return null;
    }

    const { pubkey, account } = accounts[0];

    if (accounts.length > 1) {
      console.warn(
        `⚠️ Multiple certificates found with ID ${certificateId}. Using first one.`
      );
    }

    return {
      pubkey,
      data: deserializeCertificate(account.data),
    };
  }
}
