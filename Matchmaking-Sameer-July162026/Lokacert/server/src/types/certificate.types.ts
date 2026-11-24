/**
 * Certificate related types
 */

// Certificate verification status enum
import { CertificateTemplate as _CertificateTemplate } from './certificate-template.types';

export enum CertificateStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  PENDING = 'pending',
  REVOKED = 'revoked',
}

// Certificate metadata type
export interface CertificateMetadata {
  certificateId: string; // for cross-referencing // important
  issueDate?: string;
  completionDate?: string;
  course?: string;
  duration?: string;
  skills?: string[];
  achievement?: string;
  score?: number;
  grade?: string;
  [key: string]: unknown;
}

// Certificate type definition
interface _CertificateDetails {
  name: string; // certificate name
  description?: string; // certificate description
  txId?: string; // Blockchain transaction ID (Optional)
  metadata: CertificateMetadata; // Metadata JSON
}

export interface Certificate {
  certificateId: string;
  company: string; // the company who issued this certificate (company PDA)
  employee: string; // employee who received this certificate
  template: string; // id of the template used (CertificateTemplate) (PDA)
  certificateDetails: string; // cid arweave
  status: CertificateStatus;
  createdAt: string;
  expiresAt?: string;
}

// pub struct Certificate {
//     pub certificate_id: String,       // 4 + 64 = 68 bytes
//     pub company: Pubkey,              // 32 bytes - For filtering by company
//     pub employee: Pubkey,             // 32 bytes - For filtering by employee
//     pub employee_wallet: Pubkey,      // 32 bytes - For filtering by wallet
//     pub issuer: Pubkey,               // 32 bytes
//     pub template: String,             // 4 + 64 = 68 bytes
//     pub metadata_uri: String,         // 4 + 200 = 204 bytes
//     pub issued_at: i64,               // 8 bytes
//     pub is_revoked: bool,             // 1 byte
//     pub revoked_at: i64,              // 8 bytes
//     pub bump: u8,                     // 1 byte
// }
