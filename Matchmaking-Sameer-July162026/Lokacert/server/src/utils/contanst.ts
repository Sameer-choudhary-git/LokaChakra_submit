// ============================================================================
// STRUCT SIZE CONSTANTS (Based on latest contract)
// ============================================================================
// Account struct sizes (including 8-byte discriminator)

// Company: 8 + 32 + 6 + 47 + 1 + 8 + 2 + 4 + 1 + 2 + 4 + 1 + 1 = 117 bytes
export const COMPANY_SIZE = 117;

// PendingTransfer: 8 + 32 + 32 + 1 = 73 bytes
export const PENDING_TRANSFER_SIZE = 73;

// Employee: 8 + 32 + 32 + 47 + 1 + 1 + 1 + 1 + 1 = 124 bytes
export const EMPLOYEE_SIZE = 124;

// Certificate: 8 + 6 + 32 + 32 + 6 + 47 + 1 + 8 + 8 + 1 + 1 = 150 bytes
export const CERTIFICATE_SIZE = 150;

// CertificateTemplate: 8 + 6 + 32 + 47 + 2 + 1 + 1 = 97 bytes
export const CERTIFICATE_TEMPLATE_SIZE = 97;

// AwardType: 8 + 6 + 32 + 47 + 1 + 8 + 8 + 8 + 1 + 1 = 120 bytes
export const AWARD_TYPE_SIZE = 120;

// Award: 8 + 6 + 32 + 32 + 32 + 32 + 8 + 1 + 1 = 152 bytes
export const AWARD_SIZE = 152;

// ============================================================================
// FIELD SIZE CONSTANTS (Based on contract constraints)
// ============================================================================

export const COMPANY_ID_SIZE = 6; // [u8; 6] fixed size
export const CERTIFICATE_ID_SIZE = 6; // [u8; 6] fixed size
export const TEMPLATE_ID_SIZE = 6; // [u8; 6] fixed size
export const AWARD_TYPE_ID_SIZE = 6; // [u8; 6] fixed size
export const AWARD_ID_SIZE = 6; // [u8; 6] fixed size

// String field constraints from contract
export const CID_MAX_SIZE = 43; // Contract constraint: max 43 characters
export const NAME_MAX_SIZE = 32; // Contract constraint: max 32 characters
export const SYMBOL_MAX_SIZE = 10; // Contract constraint: max 10 characters
export const URI_MAX_SIZE = 43; // Contract constraint: max 43 characters

// ============================================================================
// PDA SEED CONSTANTS
// ============================================================================

export const COMPANY_SEED = 'company';
export const TRANSFER_REQUEST_SEED = 'transfer_request';
export const EMPLOYEE_SEED = 'employee';
export const CERTIFICATE_SEED = 'certificate';
export const TEMPLATE_SEED = 'template';
export const AWARD_TYPE_SEED = 'award_type';
export const AWARD_SEED = 'award';
export const AWARD_MINT_SEED = 'award_mint';

// ============================================================================
// VALIDATION CONSTANTS  ==> ON HOLD ( MAYBE NOT NEEDED )
// ============================================================================

export const MIN_COMPANY_ID_LENGTH = 3;
export const MIN_AWARD_TYPE_ID_LENGTH = 3;
export const MIN_AWARD_ID_LENGTH = 3;
export const MIN_NAME_LENGTH = 2;
export const MIN_SYMBOL_LENGTH = 1;

// ============================================================================
// ENUM MAPPINGS
// ============================================================================

export enum EmployeeStatus {
  Pending = 0,
  Active = 1,
  Inactive = 2,
}

export enum CertificateStatus {
  Active = 0,
  Revoked = 1,
  Expired = 2,
}

export const EMPLOYEE_STATUS_MAP = ['Pending', 'Active', 'Inactive'];
export const CERTIFICATE_STATUS_MAP = ['Active', 'Revoked', 'Expired'];

// ============================================================================
// METADATA STRUCTURES
// ============================================================================

// Metadata URI Structure Example for Awards
export const AWARD_METADATA_EXAMPLE = {
  name: 'Employee of the Month',
  symbol: 'EOTM',
  description:
    'Awarded to outstanding employees who demonstrate exceptional performance, leadership, and dedication.',
  image: 'https://arweave.net/image_cid_here',
  external_url: 'https://yourcompany.com/awards/eotm',
  attributes: [
    {
      trait_type: 'Award Type',
      value: 'Monthly Recognition',
    },
    {
      trait_type: 'Category',
      value: 'Performance',
    },
    {
      trait_type: 'Issue Date',
      value: new Date().toISOString(),
    },
  ],
  properties: {
    category: 'award',
    creators: [
      {
        address: 'CompanyPublicKey...',
        share: 100,
      },
    ],
    files: [
      {
        uri: 'https://arweave.net/image_cid_here',
        type: 'image/png',
      },
    ],
  },
};

// ============================================================================
// EVENT SIZE CONSTANTS (For manual parsing)
// ============================================================================

// Event sizes include 8-byte discriminator
export const EVENT_SIZES = {
  // CompanyInitialized: 8 + 32 + 32 + 6 + 8 + 1 = 87 bytes
  CompanyInitialized: 87,
  
  // CompanyAuthorityTransferProposed: 8 + 32 + 32 + 32 + 8 = 112 bytes
  CompanyAuthorityTransferProposed: 112,
  
  // CompanyAuthorityTransferred: 8 + 32 + 32 + 32 + 8 = 112 bytes
  CompanyAuthorityTransferred: 112,
  
  // CompanyAuthorityTransferCancelled: 8 + 32 + 32 + 8 = 80 bytes
  CompanyAuthorityTransferCancelled: 80,
  
  // CompanyUpdated: 8 + 32 + 8 = 48 bytes
  CompanyUpdated: 48,
  
  // EmployeeAdded: 8 + 32 + 32 + 32 + 8 = 112 bytes
  EmployeeAdded: 112,
  
  // EmployeeConfirmed: 8 + 32 + 32 + 32 + 8 = 112 bytes
  EmployeeConfirmed: 112,
  
  // EmployeeStatusUpdated: 8 + 32 + 32 + 1 + 1 + 8 = 82 bytes
  EmployeeStatusUpdated: 82,
  
  // EmployeeDetailsUpdated: 8 + 32 + 32 + 8 = 80 bytes
  EmployeeDetailsUpdated: 80,
  
  // CertificateIssued: 8 + 32 + 32 + 32 + 6 + 8 = 118 bytes
  CertificateIssued: 118,
  
  // CertificateRevoked: 8 + 32 + 32 + 32 + 8 = 112 bytes
  CertificateRevoked: 112,
  
  // CertificateTemplateCreated: 8 + 32 + 32 + 6 + 8 = 86 bytes
  CertificateTemplateCreated: 86,
  
  // CertificateTemplateUpdated: 8 + 32 + 32 + 6 + 8 = 86 bytes
  CertificateTemplateUpdated: 86,
  
  // AwardTypeCreated: 8 + 32 + 32 + 6 + 8 = 86 bytes
  AwardTypeCreated: 86,
  
  // AwardTypeUpdated: 8 + 32 + 32 + 8 = 80 bytes
  AwardTypeUpdated: 80,
  
  // AwardMinted: 8 + 32 + 32 + 32 + 32 + 32 + 6 + 8 = 182 bytes
  AwardMinted: 182,
  
  // EmployeeClosed: 8 + 32 + 32 + 32 + 8 = 112 bytes
  EmployeeClosed: 112,
  
  // CertificateClosed: 8 + 32 + 32 + 32 + 8 = 112 bytes
  CertificateClosed: 112,
};

// ============================================================================
// IMPORTANT NOTES
// ============================================================================

/**
 * CRITICAL SIZE CONSTRAINTS:
 * 
 * 1. All string fields (company_details, employee_details, certificate_details, 
 *    metadata_uri) are limited to 43 characters max (CID_MAX_SIZE)
 * 
 * 2. Award NFT name field: max 32 characters (NAME_MAX_SIZE)
 * 
 * 3. Award NFT symbol field: max 10 characters (SYMBOL_MAX_SIZE)
 * 
 * 4. All ID fields are fixed 6-byte arrays ([u8; 6])
 * 
 * 5. Award type name + award id combined should not exceed 31 bytes to ensure
 *    compatibility with Solana account name limits
 * 
 * 6. All accounts now include a 'version' field (u8) for future upgradability
 * 
 * 7. All accounts include a 'bump' field (u8) for PDA derivation
 * 
 * 8. Minted award NFTs are SOULBOUND (frozen) and cannot be transferred
 */

// ============================================================================
// ERROR CODES (From contract)
// ============================================================================

export const ERROR_CODES = {
  CidTooLong: 6000,
  NameTooLong: 6001,
  UriTooLong: 6002,
  SymbolTooLong: 6003,
  CompanyInactive: 6004,
  EmployeeNotActive: 6005,
  CertificateNotActive: 6006,
  AwardTypeInactive: 6007,
  Unauthorized: 6008,
  InvalidCompany: 6009,
  InvalidEmployee: 6010,
  InvalidTokenAccount: 6011,
  NumericalOverflow: 6012,
  InvalidEmployeeState: 6013,
  EmployeeStillActive: 6014,
  CertificateNotClosable: 6015,
};

export const ERROR_MESSAGES = {
  [ERROR_CODES.CidTooLong]: 'CID too long (max 43 characters)',
  [ERROR_CODES.NameTooLong]: 'Name too long (max 32 characters)',
  [ERROR_CODES.UriTooLong]: 'URI too long (max 43 characters)',
  [ERROR_CODES.SymbolTooLong]: 'Symbol too long (max 10 characters)',
  [ERROR_CODES.CompanyInactive]: 'Company is not active',
  [ERROR_CODES.EmployeeNotActive]: 'Employee is not active',
  [ERROR_CODES.CertificateNotActive]: 'Certificate is not active',
  [ERROR_CODES.AwardTypeInactive]: 'Award type is not active',
  [ERROR_CODES.Unauthorized]: 'Unauthorized access',
  [ERROR_CODES.InvalidCompany]: 'Invalid company',
  [ERROR_CODES.InvalidEmployee]: 'Invalid employee',
  [ERROR_CODES.InvalidTokenAccount]: 'Invalid token account',
  [ERROR_CODES.NumericalOverflow]: 'Numerical overflow',
  [ERROR_CODES.InvalidEmployeeState]: 'Invalid employee state',
  [ERROR_CODES.EmployeeStillActive]: 'Employee is still active',
  [ERROR_CODES.CertificateNotClosable]: 'Certificate cannot be closed',
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface CompanyAccount {
  authority: string; // Pubkey as string
  companyId: number[]; // [u8; 6]
  companyDetails: string;
  isActive: boolean;
  createdAt: number; // i64 timestamp
  totalEmployees: number; // u16
  totalCertificates: number; // u32
  totalTemplates: number; // u8
  totalAwards: number; // u16
  totalRevoked: number; // u32
  version: number; // u8
  bump: number; // u8
}

export interface EmployeeAccount {
  wallet: string; // Pubkey as string
  company: string; // Pubkey as string
  employeeDetails: string;
  status: EmployeeStatus;
  totalCertificates: number; // u8
  totalAwards: number; // u8
  version: number; // u8
  bump: number; // u8
}

export interface CertificateAccount {
  certificateId: number[]; // [u8; 6]
  company: string; // Pubkey as string
  employee: string; // Pubkey as string
  template: number[]; // [u8; 6]
  certificateDetails: string;
  status: CertificateStatus;
  createdAt: number; // i64 timestamp
  expiresAt: number; // i64 timestamp (0 = no expiry)
  version: number; // u8
  bump: number; // u8
}

export interface CertificateTemplateAccount {
  templateId: number[]; // [u8; 6]
  company: string; // Pubkey as string
  certificateDetails: string;
  totalIssued: number; // u16
  version: number; // u8
  bump: number; // u8
}

export interface AwardTypeAccount {
  awardTypeId: number[]; // [u8; 6]
  company: string; // Pubkey as string
  metadataUri: string;
  isActive: boolean;
  totalIssued: number; // u64
  createdAt: number; // i64 timestamp
  updatedAt: number; // i64 timestamp
  version: number; // u8
  bump: number; // u8
}

export interface AwardAccount {
  awardId: number[]; // [u8; 6]
  company: string; // Pubkey as string
  employee: string; // Pubkey as string
  awardType: string; // Pubkey as string
  mint: string; // Pubkey as string
  createdAt: number; // i64 timestamp
  version: number; // u8
  bump: number; // u8
}

export interface PendingTransferAccount {
  company: string; // Pubkey as string
  newAuthority: string; // Pubkey as string
  bump: number; // u8
}