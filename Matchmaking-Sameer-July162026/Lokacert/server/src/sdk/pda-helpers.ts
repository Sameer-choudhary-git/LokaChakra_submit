import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from './types';
import { deserializeCompany } from './deserializers';
import { utils } from './utils';
import {
  COMPANY_SEED,
  EMPLOYEE_SEED,
  CERTIFICATE_SEED,
  TEMPLATE_SEED,
  AWARD_TYPE_SEED,
  AWARD_SEED,
  AWARD_MINT_SEED,
  TRANSFER_REQUEST_SEED, // Make sure to add this to your constants file!
} from '../utils/contanst';

export class PDAHelper {
  connection = new Connection(
    process.env.SOLANA_RPC_URL || 'http://localhost:8899'
  );

  private findPDASync(seeds: (Buffer | Uint8Array)[]): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
  }

  getCompanyPDA(companyId: string): [PublicKey, number] {
    // Convert string to 6-byte array for contract compatibility
    const companyIdBytes = utils.stringToU8Array6(companyId);
    return this.findPDASync([
      Buffer.from(COMPANY_SEED),
      Buffer.from(companyIdBytes),
    ]);
  }

  async getCompanyPDAByPubkey(
    companyPubkey: PublicKey
  ): Promise<[PublicKey, number] | null> {
    const accountInfo = await this.connection.getAccountInfo(companyPubkey);

    if (!accountInfo) return null;
    const companyData = deserializeCompany(accountInfo.data);
    if (!companyData || !companyData.companyId) return null;
    // Convert from 6-byte array back to string
    const companyIdStr = utils.u8Array6ToString(companyData.companyId);
    return this.getCompanyPDA(companyIdStr);
  }

  getEmployeePDA(
    companyPubkey: PublicKey,
    employeeWallet: PublicKey
  ): [PublicKey, number] {
    return this.findPDASync([
      Buffer.from(EMPLOYEE_SEED),
      companyPubkey.toBuffer(),
      employeeWallet.toBuffer(),
    ]);
  }

  // NEW: Added for Authority Transfer
  getPendingTransferPDA(companyPubkey: PublicKey): [PublicKey, number] {
    return this.findPDASync([
      Buffer.from(TRANSFER_REQUEST_SEED),
      companyPubkey.toBuffer(),
    ]);
  }

  getCertificatePDA(
    companyPubkey: PublicKey,
    certificateId: string
  ): [PublicKey, number] {
    const certificateIdBytes = utils.stringToU8Array6(certificateId);
    return this.findPDASync([
      Buffer.from(CERTIFICATE_SEED),
      companyPubkey.toBuffer(),
      Buffer.from(certificateIdBytes),
    ]);
  }

  getTemplatePDA(
    companyPubkey: PublicKey,
    templateId: string
  ): [PublicKey, number] {
    const templateIdBytes = utils.stringToU8Array6(templateId);
    return this.findPDASync([
      Buffer.from(TEMPLATE_SEED),
      companyPubkey.toBuffer(),
      Buffer.from(templateIdBytes),
    ]);
  }

  getAwardTypePDA(
    companyPubkey: PublicKey,
    awardTypeId: string
  ): [PublicKey, number] {
    const awardTypeIdBytes = utils.stringToU8Array6(awardTypeId);
    return this.findPDASync([
      Buffer.from(AWARD_TYPE_SEED),
      companyPubkey.toBuffer(),
      Buffer.from(awardTypeIdBytes),
    ]);
  }

  getAwardPDA(companyPubkey: PublicKey, awardId: string): [PublicKey, number] {
    const awardIdBytes = utils.stringToU8Array6(awardId);
    return this.findPDASync([
      Buffer.from(AWARD_SEED),
      companyPubkey.toBuffer(),
      Buffer.from(awardIdBytes),
    ]);
  }

  getAwardMintPDA(
    companyPubkey: PublicKey,
    awardId: string
  ): [PublicKey, number] {
    const awardIdBytes = utils.stringToU8Array6(awardId);
    return this.findPDASync([
      Buffer.from(AWARD_MINT_SEED),
      companyPubkey.toBuffer(),
      Buffer.from(awardIdBytes),
    ]);
  }
}