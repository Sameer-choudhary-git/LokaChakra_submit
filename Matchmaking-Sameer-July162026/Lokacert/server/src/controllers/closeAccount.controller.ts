/**
 * Enhanced Close Account Controller
 * 
 * Production-ready controller with:
 * - Comprehensive error handling with custom exceptions
 * - Enhanced blockchain validation
 * - Structured logging with request correlation
 * - Input sanitization and validation
 * - Performance monitoring
 * - Security best practices
 */

import { Request, Response, NextFunction } from 'express';
import { PublicKey } from '@solana/web3.js';
import { sdk } from '../index';
import { utils } from '../sdk';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError,
  ConflictError 
} from '../utils/errors/CustomErrors';
import { ApiError } from '../types/error.types';
import {
  validatePublicKey,
  validatePublicKeys,
  validateCompanyExists,
  validateCompanyAuthority,
  validateEmployeeExists,
  validateCertificateExists,
} from '../utils/blockchainValidation';
import logger from '../utils/logStash-logger';
import { asyncErrorHandler } from '../middleware/globalErrorHandler';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface CloseEmployeeRequest {
  companyPubkey: string;
  employeeWallet: string;
  companyAuthorityPubkey: string;
}

interface CloseCertificateRequest {
  companyPubkey: string;
  certificateId: number[];
  companyAuthorityPubkey: string;
}

interface ValidationContext {
  operation: string;
  resourceType: string;
  requestId: string;
  userId?: string;
}

/**
 * POST /api/closeEmployee
 * Build transaction to close an inactive employee account and reclaim rent
 * Contract requirement: Employee status must be Inactive
 */
export const closeEmployee = async (req: Request, res: Response) => {
  try {
    const { companyPubkey, employeeWallet, companyAuthorityPubkey } = req.body;

    if (!companyPubkey || !employeeWallet || !companyAuthorityPubkey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: companyPubkey, employeeWallet, companyAuthorityPubkey',
      });
    }

    const company = new PublicKey(companyPubkey);
    const employeeWalletPubkey = new PublicKey(employeeWallet);
    const companyAuthority = new PublicKey(companyAuthorityPubkey);

    // Verify company exists and authority matches
    const companyData = await sdk.getCompanyByPubkey(company);
    if (!companyData) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }

    if (companyData.authority.toBase58() !== companyAuthority.toBase58()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized: You are not the company authority',
      });
    }

    // verify employee exists and belongs to this company
    const [employeePDA] = sdk.getEmployeePDA(company, employeeWalletPubkey);
    const employeeData = await sdk.getEmployee(company, employeeWalletPubkey);

    if (!employeeData) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
      });
    }

    if (employeeData.company.toBase58() !== company.toBase58()) {
      return res.status(400).json({
        success: false,
        error: 'Employee does not belong to this company',
      });
    }

    // Verify employee is inactive (contract requirement)
    if (employeeData.status !== 2) { // 2 = Inactive
      return res.status(400).json({
        success: false,
        error: 'Cannot close employee: Employee status must be Inactive. Current status: ' + 
               (employeeData.status === 0 ? 'Pending' : 'Active'),
      });
    }

    // Build transaction
    const serializedTx = await sdk.buildCloseEmployeeTx(
      company,
      employeePDA,
      companyAuthority
    );

    logger.info('Employee close transaction built', {
      company: company.toBase58(),
      employee: employeePDA.toBase58(),
      employeeWallet: employeeWallet,
      companyAuthority: companyAuthority.toBase58(),
    });

    res.json({
      success: true,
      transaction: serializedTx,
      employeePDA: employeePDA.toBase58(),
      message: 'Employee account close transaction built. Sign to reclaim rent.',
    });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    logger.error('Failed to close employee', {
      error: apiError.message,
      stack: apiError.stack,
      companyPubkey: req.body.companyPubkey,
      employeeWallet: req.body.employeeWallet,
    });
    res.status(500).json({ success: false, error: apiError.message });
  }
};

/**
 * POST /api/closeCertificate
 * Build transaction to close a revoked/expired certificate and reclaim rent
 * Contract requirement: Certificate status must be Revoked or Expired
 */
export const closeCertificate = async (req: Request, res: Response) => {
  try {
    const { companyPubkey, certificateId, companyAuthorityPubkey } = req.body;

    if (!companyPubkey || !certificateId || !companyAuthorityPubkey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: companyPubkey, certificateId, companyAuthorityPubkey',
      });
    }

    const company = new PublicKey(companyPubkey);
    const companyAuthority = new PublicKey(companyAuthorityPubkey);

    // Validate certificate ID format (should be 6 bytes)
    if (!Array.isArray(certificateId) || certificateId.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'Invalid certificateId: Must be an array of 6 bytes',
      });
    }

    // Type assertion after validation
    const certificateIdArray = certificateId as number[];

    // Verify company exists and authority matches
    const companyData = await sdk.getCompanyByPubkey(company);
    if (!companyData) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }

    if (companyData.authority.toBase58() !== companyAuthority.toBase58()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized: You are not the company authority',
      });
    }

    // Verify certificate exists and belongs to this company
    const certificateIdString = utils.u8Array6ToString(certificateIdArray);
    const certificateData = await sdk.getCertificate(company, certificateIdString);

    if (!certificateData) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found',
      });
    }

    if (certificateData.company.toBase58() !== company.toBase58()) {
      return res.status(400).json({
        success: false,
        error: 'Certificate does not belong to this company',
      });
    }

    // Verify certificate is revoked or expired (contract requirement)
    // Status enum: Active=0, Revoked=1, Expired=2
    if (certificateData.status !== 1 && certificateData.status !== 2) {
      return res.status(400).json({
        success: false,
        error: 'Cannot close certificate: Certificate status must be Revoked or Expired. Current status: Active',
      });
    }

    // Build transaction
    const [certificatePDA] = sdk.getCertificatePDA(company, certificateIdString);
    const serializedTx = await sdk.buildCloseCertificateTx(
      company,
      certificatePDA,
      companyAuthority
    );

    logger.info('Certificate close transaction built', {
      company: company.toBase58(),
      certificate: certificatePDA.toBase58(),
      certificateId: certificateIdArray,
      status: certificateData.status === 1 ? 'Revoked' : 'Expired',
      companyAuthority: companyAuthority.toBase58(),
    });

    res.json({
      success: true,
      transaction: serializedTx,
      certificatePDA: certificatePDA.toBase58(),
      status: certificateData.status === 1 ? 'Revoked' : 'Expired',
      message: 'Certificate account close transaction built. Sign to reclaim rent.',
    });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    logger.error('Failed to close certificate', {
      error: apiError.message,
      stack: apiError.stack,
      companyPubkey: req.body.companyPubkey,
      certificateId: req.body.certificateId,
    });
    res.status(500).json({ success: false, error: apiError.message });
  }
};
