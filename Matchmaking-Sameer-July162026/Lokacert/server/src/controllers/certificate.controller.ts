/**
 * Enhanced Certificate Controller
 * 
 * Production-ready controller with:
 * - Clear separation of POST (write) and GET (read) operations
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
import { uploadToArweave } from '../utils/arweave';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError,
  ConflictError,
  ArweaveError,
  BlockchainError 
} from '../utils/errors/CustomErrors';
import {
  validatePublicKey,
  validatePublicKeys,
  validateIdFormat,
  validateCidLength,
  validateCompanyActive,
  validateCompanyAuthority,
  validateEmployeeActive,
  validateCertificateExists,
  validateTemplateExists,
} from '../utils/blockchainValidation';
import logger from '../utils/logStash-logger';
import { asyncErrorHandler } from '../middleware/globalErrorHandler';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface IssueCertificateRequest {
  companyPubkey: string;
  employeePubkey: string;
  certificateId: string;
  templateId: string;
  certificateDetails: any;
  authorityPubkey: string;
  expiresAt?: number;
}

interface RevokeCertificateRequest {
  companyPubkey: string;
  certificatePubkey: string;
  authorityPubkey: string;
}

interface ValidationContext {
  operation: string;
  resourceType: string;
  requestId: string;
  userId?: string;
}

// ============================================================================
// POST OPERATIONS (WRITE/TRANSACTION BUILDING)
// ============================================================================

/**
 * POST /api/certificate/issue
 * Build transaction to issue a certificate
 */
export const issueCertificate = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const context: ValidationContext = {
    operation: 'issueCertificate',
    resourceType: 'Certificate',
    requestId
  };

  logger.info('Starting certificate issuance process', { requestId });

  try {
    const {
      companyPubkey,
      employeePubkey,
      certificateId,
      templateId,
      certificateDetails,
      authorityPubkey,
      expiresAt
    }: IssueCertificateRequest = req.body;

    // Validate required fields
    if (!companyPubkey || !employeePubkey || !certificateId || !templateId || !certificateDetails || !authorityPubkey) {
      throw new ValidationError(
        'Missing required fields: companyPubkey, employeePubkey, certificateId, templateId, certificateDetails, authorityPubkey'
      );
    }

    // Validate ID formats
    const validatedCertificateId = validateIdFormat(certificateId, 'Certificate');
    const validatedTemplateId = validateIdFormat(templateId, 'Template');

    // Validate public keys
    const { company, employee, authority } = validatePublicKeys({
      company: companyPubkey,
      employee: employeePubkey,
      authority: authorityPubkey,
    });

    // Blockchain validations
    await validateCompanyActive(company, context);
    await validateCompanyAuthority(company, authority, context);
    await validateEmployeeActive(employee, context);

    // Validate template exists
    const [templatePDA] = sdk.getTemplatePDA(company, validatedTemplateId);
    await validateTemplateExists(templatePDA, context);

    // Check if certificate already exists
    const [certificatePDA] = sdk.getCertificatePDA(company, validatedCertificateId);
    const existingCertificate = await sdk.getCertificateByPubkey(certificatePDA);
    if (existingCertificate) {
      throw new ConflictError(`Certificate with ID '${validatedCertificateId}' already exists`);
    }

    logger.info('Certificate validation passed, uploading details to Arweave', { 
      requestId, 
      certificateId: validatedCertificateId,
      certificatePDA: certificatePDA.toBase58()
    });

    // Upload certificate details to Arweave
    const certificateDetailsCid = await uploadToArweave(JSON.stringify(certificateDetails));
    if (!certificateDetailsCid) {
      throw new ArweaveError('Failed to upload certificate details to Arweave');
    }

    validateCidLength(certificateDetailsCid, 'certificateDetailsCid');

    logger.info('Certificate details uploaded to Arweave, building transaction', {
      requestId,
      certificateDetailsCid
    });

    // Build transaction
    const serializedTx = await sdk.buildIssueCertificateTx(
      company,
      employee,
      validatedCertificateId,
      validatedTemplateId,
      certificateDetailsCid,
      authority,
      expiresAt
    );

    logger.info('Certificate issuance transaction built successfully', {
      requestId,
      company: company.toBase58(),
      employee: employee.toBase58(),
      certificateId: validatedCertificateId,
      certificatePDA: certificatePDA.toBase58(),
    });

    res.json({
      success: true,
      data: {
        transaction: serializedTx,
        certificateId: validatedCertificateId,
        certificatePDA: certificatePDA.toBase58(),
        certificateDetailsCid,
        expiresAt: expiresAt || 0
      },
      message: 'Certificate issuance transaction built successfully. Company authority must sign.',
      requestId
    });

  } catch (error) {
    logger.error('Certificate issuance failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    next(error);
  }
});

/**
 * POST /api/certificate/revoke
 * Build transaction to revoke a certificate
 */
export const revokeCertificate = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const context: ValidationContext = {
    operation: 'revokeCertificate',
    resourceType: 'Certificate',
    requestId
  };

  logger.info('Starting certificate revocation process', { requestId });

  try {
    const { companyPubkey, certificatePubkey, authorityPubkey }: RevokeCertificateRequest = req.body;

    // Validate required fields
    if (!companyPubkey || !certificatePubkey || !authorityPubkey) {
      throw new ValidationError('Missing required fields: companyPubkey, certificatePubkey, authorityPubkey');
    }

    // Validate public keys
    const { company, certificate, authority } = validatePublicKeys({
      company: companyPubkey,
      certificate: certificatePubkey,
      authority: authorityPubkey,
    });

    // Blockchain validations
    await validateCompanyAuthority(company, authority, context);
    const cert = await validateCertificateExists(certificate, context);

    // Verify certificate belongs to company
    if (cert.company.toBase58() !== company.toBase58()) {
      throw new ForbiddenError('Certificate does not belong to this company');
    }

    // Verify certificate is not already revoked
    if (cert.status === 1) { // Revoked status
      throw new ValidationError('Certificate is already revoked');
    }

    logger.info('Certificate revocation validation passed, building transaction', {
      requestId,
      certificate: certificate.toBase58(),
      company: company.toBase58(),
    });

    // Build transaction
    const serializedTx = await sdk.buildRevokeCertificateTx(
      company,
      certificate,
      authority
    );

    logger.info('Certificate revocation transaction built successfully', {
      requestId,
      certificate: certificate.toBase58(),
      company: company.toBase58(),
    });

    res.json({
      success: true,
      data: {
        transaction: serializedTx,
        certificatePubkey: certificate.toBase58(),
      },
      message: 'Certificate revocation transaction built successfully. Company authority must sign.',
      requestId
    });

  } catch (error) {
    logger.error('Certificate revocation failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

// ============================================================================
// GET OPERATIONS (READ/DATA RETRIEVAL)
// ============================================================================

/**
 * GET /api/certificate/:certificateId
 * Get certificate by ID
 * Query params: companyPubkey (required)
 */
export const getCertificateById = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const { certificateId } = req.params;
  const { companyPubkey } = req.query;

  logger.info('Fetching certificate by ID', { requestId, certificateId, companyPubkey });

  try {
    if (!certificateId) {
      throw new ValidationError('Certificate ID is required', 'certificateId');
    }

    if (!companyPubkey || typeof companyPubkey !== 'string') {
      throw new ValidationError('Company pubkey query parameter is required', 'companyPubkey');
    }

    const validatedCertificateId = validateIdFormat(certificateId, 'Certificate');
    const company = validatePublicKey(companyPubkey, 'companyPubkey');

    const certificate = await sdk.getCertificate(company, validatedCertificateId);
    if (!certificate) {
      throw new NotFoundError('Certificate', validatedCertificateId);
    }

    logger.info('Certificate fetched successfully', {
      requestId,
      certificateId: validatedCertificateId,
      status: certificate.status
    });

    res.json({
      success: true,
      data: {
        certificate: {
          ...certificate,
          company: certificate.company.toBase58(),
          employee: certificate.employee.toBase58(),
          createdAt: certificate.createdAt.toString(),
          expiresAt: certificate.expiresAt.toString(),
          status: certificate.status,
          statusText: getCertificateStatusText(certificate.status),
          version: certificate.version
        }
      },
      requestId
    });

  } catch (error) {
    logger.error('Failed to fetch certificate by ID', {
      requestId,
      certificateId,
      companyPubkey,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * GET /api/certificate/pubkey/:pubkey
 * Get certificate by public key
 */
export const getCertificateByPubkey = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const { pubkey } = req.params;

  logger.info('Fetching certificate by pubkey', { requestId, pubkey });

  try {
    if (!pubkey) {
      throw new ValidationError('Certificate pubkey is required', 'pubkey');
    }

    const certificatePubkey = validatePublicKey(pubkey, 'pubkey');
    const certificate = await validateCertificateExists(certificatePubkey);

    logger.info('Certificate fetched successfully by pubkey', {
      requestId,
      pubkey,
      status: certificate.status
    });

    res.json({
      success: true,
      data: {
        certificate: {
          pubkey: certificatePubkey.toBase58(),
          ...certificate,
          company: certificate.company.toBase58(),
          employee: certificate.employee.toBase58(),
          createdAt: certificate.createdAt.toString(),
          expiresAt: certificate.expiresAt.toString(),
          status: certificate.status,
          statusText: getCertificateStatusText(certificate.status),
          version: certificate.version
        }
      },
      requestId
    });

  } catch (error) {
    logger.error('Failed to fetch certificate by pubkey', {
      requestId,
      pubkey,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * GET /api/certificate/verify/:pubkey
 * Verify certificate validity
 */
export const verifyCertificate = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const { pubkey } = req.params;

  logger.info('Verifying certificate', { requestId, pubkey });

  try {
    if (!pubkey) {
      throw new ValidationError('Certificate pubkey is required', 'pubkey');
    }

    const certificatePubkey = validatePublicKey(pubkey, 'pubkey');
    const verification = await sdk.verifyCertificate(certificatePubkey);

    logger.info('Certificate verification completed', {
      requestId,
      pubkey,
      isValid: verification.isValid,
      reasons: verification.reasons
    });

    res.json({
      success: true,
      data: {
        pubkey: certificatePubkey.toBase58(),
        isValid: verification.isValid,
        reasons: verification.reasons,
        certificate: verification.certificate ? {
          ...verification.certificate,
          company: verification.certificate.company.toBase58(),
          employee: verification.certificate.employee.toBase58(),
          createdAt: verification.certificate.createdAt.toString(),
          expiresAt: verification.certificate.expiresAt.toString(),
          status: verification.certificate.status,
          statusText: getCertificateStatusText(verification.certificate.status),
        } : null,
        company: verification.company ? {
          ...verification.company,
          authority: verification.company.authority.toBase58(),
          createdAt: verification.company.createdAt.toString(),
        } : null,
        employee: verification.employee ? {
          ...verification.employee,
          wallet: verification.employee.wallet.toBase58(),
          company: verification.employee.company.toBase58(),
        } : null
      },
      requestId
    });

  } catch (error) {
    logger.error('Failed to verify certificate', {
      requestId,
      pubkey,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * GET /api/certificate/company
 * Get all certificates for a company
 * Query params: companyPubkey (required)
 */
export const getCompanyCertificates = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const { companyPubkey } = req.query;

  logger.info('Fetching company certificates', { requestId, companyPubkey });

  try {
    if (!companyPubkey || typeof companyPubkey !== 'string') {
      throw new ValidationError('Missing required query parameter: companyPubkey', 'companyPubkey');
    }

    const company = validatePublicKey(companyPubkey, 'companyPubkey');
    
    // Verify company exists
    await validateCompanyActive(company);
    
    // Fetch certificates
    const certificates = await sdk.getAllCertificatesOfCompany(company);

    logger.info('Company certificates fetched successfully', {
      requestId,
      companyPubkey,
      certificateCount: certificates.length
    });

    res.json({
      success: true,
      data: {
        companyPubkey,
        count: certificates.length,
        certificates: certificates.map((cert: any) => ({
          pubkey: cert.pubkey.toBase58(),
          data: {
            ...cert.data,
            company: cert.data.company.toBase58(),
            employee: cert.data.employee.toBase58(),
            createdAt: cert.data.createdAt.toString(),
            expiresAt: cert.data.expiresAt.toString(),
            status: cert.data.status,
            statusText: getCertificateStatusText(cert.data.status)
          }
        }))
      },
      requestId
    });

  } catch (error) {
    logger.error('Failed to fetch company certificates', {
      requestId,
      companyPubkey,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert certificate status number to human-readable text
 */
function getCertificateStatusText(status: number): string {
  switch (status) {
    case 0: return 'Active';
    case 1: return 'Revoked';
    case 2: return 'Expired';
    default: return 'Unknown';
  }
}
