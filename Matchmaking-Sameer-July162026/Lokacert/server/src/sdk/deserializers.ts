import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import {
  CompanyData,
  EmployeeData,
  CertificateData,
  CertificateTemplateData,
  AwardTypeData,
  AwardData,
  PendingTransferData, // Add this to imports
  EmployeeStatus,
  CertificateStatus,
} from './types';

export class AccountDeserializer {
  private offset: number = 0;

  constructor(private data: Buffer) {
    this.offset = 8; // Skip discriminator
  }

  readPublicKey(): PublicKey {
    const key = new PublicKey(this.data.slice(this.offset, this.offset + 32));
    this.offset += 32;
    return key;
  }

  readString(): string {
    const len = this.data.readUInt32LE(this.offset);
    this.offset += 4;
    const str = this.data
      .slice(this.offset, this.offset + len)
      .toString('utf-8');
    this.offset += len;
    return str;
  }

  readBool(): boolean {
    const val = this.data[this.offset] === 1;
    this.offset += 1;
    return val;
  }

  readI64(): BN {
    const val = new BN(this.data.slice(this.offset, this.offset + 8), 'le');
    this.offset += 8;
    return val;
  }

  readU64(): BN {
    const val = new BN(this.data.slice(this.offset, this.offset + 8), 'le');
    this.offset += 8;
    return val;
  }

  // NEW: Added for Company struct u32 fields
  readU32(): number {
    const val = this.data.readUInt32LE(this.offset);
    this.offset += 4;
    return val;
  }

  readU16(): number {
    const val = this.data.readUInt16LE(this.offset);
    this.offset += 2;
    return val;
  }

  readU8(): number {
    const val = this.data[this.offset];
    this.offset += 1;
    return val;
  }

  readU8Array6(): number[] {
    const arr = Array.from(this.data.slice(this.offset, this.offset + 6));
    this.offset += 6;
    return arr;
  }
}

export function deserializeCompany(data: Buffer): CompanyData {
  const d = new AccountDeserializer(data);
  return {
    authority: d.readPublicKey(),
    companyId: d.readU8Array6(),
    companyDetails: d.readString(),
    isActive: d.readBool(),
    createdAt: d.readI64(),
    totalEmployees: d.readU16(),
    totalCertificates: d.readU32(), // Changed from U16 to U32
    totalTemplates: d.readU8(),
    totalAwards: d.readU16(),
    totalRevoked: d.readU32(), // Changed from U16 to U32
    version: d.readU8(), // Added version
    bump: d.readU8(),
  };
}

export function deserializePendingTransfer(data: Buffer): PendingTransferData {
  const d = new AccountDeserializer(data);
  return {
    company: d.readPublicKey(),
    newAuthority: d.readPublicKey(),
    bump: d.readU8(),
  };
}

export function deserializeEmployee(data: Buffer): EmployeeData {
  const d = new AccountDeserializer(data);
  return {
    wallet: d.readPublicKey(),
    company: d.readPublicKey(),
    employeeDetails: d.readString(),
    status: d.readU8() as EmployeeStatus,
    totalCertificates: d.readU8(),
    totalAwards: d.readU8(),
    version: d.readU8(), // Added version
    bump: d.readU8(),
  };
}

export function deserializeCertificate(data: Buffer): CertificateData {
  const d = new AccountDeserializer(data);
  return {
    certificateId: d.readU8Array6(),
    company: d.readPublicKey(),
    employee: d.readPublicKey(),
    template: d.readU8Array6(),
    certificateDetails: d.readString(),
    status: d.readU8() as CertificateStatus,
    createdAt: d.readI64(),
    expiresAt: d.readI64(),
    version: d.readU8(), // Added version
    bump: d.readU8(),
  };
}

export function deserializeTemplate(data: Buffer): CertificateTemplateData {
  const d = new AccountDeserializer(data);
  return {
    templateId: d.readU8Array6(),
    company: d.readPublicKey(),
    certificateDetails: d.readString(),
    totalIssued: d.readU16(),
    version: d.readU8(), // Added version
    bump: d.readU8(),
  };
}

export function deserializeAwardType(data: Buffer): AwardTypeData {
  const d = new AccountDeserializer(data);
  return {
    awardTypeId: d.readU8Array6(),
    company: d.readPublicKey(),
    metadataUri: d.readString(),
    isActive: d.readBool(),
    totalIssued: d.readU64(),
    createdAt: d.readI64(),
    updatedAt: d.readI64(),
    version: d.readU8(), // Added version
    bump: d.readU8(),
  };
}

export function deserializeAward(data: Buffer): AwardData {
  const d = new AccountDeserializer(data);
  return {
    awardId: d.readU8Array6(),
    company: d.readPublicKey(),
    employee: d.readPublicKey(),
    awardType: d.readPublicKey(),
    mint: d.readPublicKey(),
    createdAt: d.readI64(),
    version: d.readU8(), // Added version
    bump: d.readU8(),
  };
}