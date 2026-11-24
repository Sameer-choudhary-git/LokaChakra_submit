import { BN } from '@coral-xyz/anchor';
import { createHash, randomBytes } from 'crypto';

export const utils = {
  /**
   * @deprecated Hash email to hex string - NO LONGER USED IN CONTRACT
   * Kept for backward compatibility only
   */
  hashEmail: async (email: string): Promise<string> => {
    const normalized = email.toLowerCase().trim();
    return createHash('sha256').update(normalized).digest('hex');
  },

  /**
   * @deprecated Generate confirmation token - NO LONGER USED IN CONTRACT
   * Kept for backward compatibility only
   */
  generateConfirmationToken: (): string => {
    return randomBytes(32).toString('hex');
  },

  /**
   * Convert string to 6-byte array for contract IDs
   */
  stringToU8Array6: (str: string): number[] => {
    const bytes = Buffer.from(str, 'utf8').slice(0, 6);
    const result = new Array(6).fill(0);
    for (let i = 0; i < Math.min(bytes.length, 6); i++) {
      result[i] = bytes[i];
    }
    // make sure to return smart contract compatible array u8[6]

    return result;
  },

  /**
   * Convert 6-byte array to string for display
   */
  u8Array6ToString: (arr: number[]): string => {
    return Buffer.from(arr).toString('utf8').replace(/\0+$/, '');
  },

  /**
   * Convert bytes to hex string
   */
  toHex: (bytes: Uint8Array): string => {
    return Buffer.from(bytes).toString('hex');
  },

  /**
   * Convert hex string to bytes
   */
  fromHex: (hex: string): Uint8Array => {
    return Uint8Array.from(Buffer.from(hex, 'hex'));
  },

  /**
   * Convert BN to number safely
   */
  bnToNumber: (bn: BN): number => {
    return bn.toNumber();
  },

  /**
   * Generate random ID
   */
  generateId: (): string => {
    return randomBytes(16).toString('hex');
  },

  /**
   * Convert Unix timestamp to Date
   */
  timestampToDate: (timestamp: BN): Date => {
    return new Date(timestamp.toNumber() * 1000);
  },

  /**
   * Convert Date to Unix timestamp
   */
  dateToTimestamp: (date: Date): number => {
    return Math.floor(date.getTime() / 1000);
  },

  /**
   * Check if certificate is expired
   */
  isExpired: (expiresAt: BN): boolean => {
    if (expiresAt.toNumber() === 0) return false; // No expiration
    const now = Math.floor(Date.now() / 1000);
    return expiresAt.toNumber() < now;
  },

  u8Array6ToBase58: (arr: number[]): string => {
    const bs58 = require('bs58');
    return bs58.encode(Buffer.from(arr));
  },
};
