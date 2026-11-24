import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

const PROGRAM_ID_ENV = process.env.PROGRAM_ID;
export const PROGRAM_ID = new PublicKey(PROGRAM_ID_ENV as string);

// Enums matching the smart contract
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

// Account data interfaces

export interface CompanyData {
  authority: PublicKey;
  companyId: number[]; // [u8; 6]
  companyDetails: string; // CID
  isActive: boolean;
  createdAt: BN; // i64
  totalEmployees: number; // u16
  totalCertificates: number; // u32
  totalTemplates: number; // u8
  totalAwards: number; // u16
  totalRevoked: number; // u32
  version: number; // u8
  bump: number;
}

export interface PendingTransferData {
  company: PublicKey;
  newAuthority: PublicKey;
  bump: number;
}

export interface EmployeeData {
  wallet: PublicKey;
  company: PublicKey;
  employeeDetails: string; // CID
  status: EmployeeStatus;
  totalCertificates: number; // u8
  totalAwards: number; // u8
  version: number; // u8
  bump: number;
}

export interface AwardTypeData {
  awardTypeId: number[]; // [u8; 6]
  company: PublicKey;
  metadataUri: string;
  isActive: boolean;
  totalIssued: BN; // u64
  createdAt: BN; // i64
  updatedAt: BN; // i64
  version: number; // u8
  bump: number;
}

export interface AwardData {
  awardId: number[]; // [u8; 6]
  company: PublicKey;
  employee: PublicKey;
  awardType: PublicKey;
  mint: PublicKey;
  createdAt: BN; // i64
  version: number; // u8
  bump: number;
}

export interface CertificateData {
  certificateId: number[]; // [u8; 6]
  company: PublicKey;
  employee: PublicKey;
  template: number[]; // [u8; 6]
  certificateDetails: string; // CID
  status: CertificateStatus;
  createdAt: BN; // i64
  expiresAt: BN; // i64 (0 = no expiration)
  version: number; // u8
  bump: number;
}

export interface CertificateTemplateData {
  templateId: number[]; // [u8; 6]
  company: PublicKey;
  certificateDetails: string; // CID
  totalIssued: number; // u16
  version: number; // u8
  bump: number;
}