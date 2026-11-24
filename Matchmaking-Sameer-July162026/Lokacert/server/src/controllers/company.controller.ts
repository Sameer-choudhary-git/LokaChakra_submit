/**
 * Enhanced Company Controller
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
import { TimeoutOperations } from '../utils/timeout-wrapper';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError, 
  ConflictError, 
  ArweaveError,
  BlockchainError,
  InternalServerError
} from '../utils/errors/CustomErrors';
import {
  validatePublicKey,
  validatePublicKeys,
  validateIdFormat,
  validateCidLength,
  validateCompanyExists,
  validateCompanyActive,
  validateCompanyAuthority,
  validatePendingTransferExists,
  validateNoPendingTransfer
} from '../utils/blockchainValidation';
import logger from '../utils/logStash-logger';
import { asyncErrorHandler } from '../middleware/globalErrorHandler';
import type { EmployeeData } from '../sdk';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface CreateCompanyRequest {
  companyId: string;
  companyDetails: any;
  employeerDetails: any;
  authorityPubkey: string;
}

interface UpdateCompanyRequest {
  companyPubkey: string;
  authorityPubkey: string;
  companyDetails?: string;
  isActive?: boolean;
}

interface AuthorityTransferRequest {
  companyPubkey: string;
  currentAuthorityPubkey: string;
  newAuthorityPubkey: string;
}

interface AcceptTransferRequest {
  companyPubkey: string;
  newAuthorityPubkey: string;
  oldAuthorityPubkey: string;
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
 * POST /api/company/create
 * Build transaction to initialize a new company
 */
export const createCompany = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const context: ValidationContext = {
    operation: 'createCompany',
    resourceType: 'Company',
    requestId
  };

  logger.info('Starting company creation process', { 
    requestId, 
    operation: context.operation 
  });

  try {
    // Validate and extract request data
    const {
      companyId,
      companyDetails,
      employeerDetails,
      authorityPubkey
    }: CreateCompanyRequest = req.body;

    // Input validation
    if (!companyId || !companyDetails || !employeerDetails || !authorityPubkey) {
      throw new ValidationError(
        'Missing required fields: companyId, companyDetails, employeerDetails, authorityPubkey'
      );
    }

    // Validate company ID format
    const validatedCompanyId = validateIdFormat(companyId, 'Company');
    
    // Validate authority public key
    const authority = validatePublicKey(authorityPubkey, 'authorityPubkey');

    // Check if company already exists
    const [companyPDA] = sdk.getCompanyPDA(validatedCompanyId);
    const existingCompany = await sdk.getCompanyByPubkey(companyPDA);
    if (existingCompany) {
      throw new ConflictError(`Company with ID '${validatedCompanyId}' already exists`);
    }

    logger.info('Company validation passed, uploading to Arweave', { 
      requestId, 
      companyId: validatedCompanyId,
      companyPDA: companyPDA.toBase58()
    });

    // Upload employee details to Arweave first with timeout protection
    const employeerDetailsCid = await TimeoutOperations.arweave.upload(
      uploadToArweave(JSON.stringify(employeerDetails)),
      'createCompany.employeeDetails',
      { requestId, companyId: validatedCompanyId }
    );
    if (!employeerDetailsCid) {
      throw new ArweaveError('Failed to upload employee details to Arweave');
    }

    // Add employee CID to company details
    const enrichedCompanyDetails = {
      ...companyDetails,
      employeerDetailsCid
    };

    // Upload enriched company details to Arweave with timeout protection
    const companyDetailsCid = await TimeoutOperations.arweave.upload(
      uploadToArweave(JSON.stringify(enrichedCompanyDetails)),
      'createCompany.companyDetails',
      { requestId, companyId: validatedCompanyId }
    );
    if (!companyDetailsCid) {
      throw new ArweaveError('Failed to upload company details to Arweave');
    }

    // Validate CID length (contract constraint)
    validateCidLength(companyDetailsCid, 'companyDetailsCid');

    logger.info('Arweave uploads completed, building transaction', { 
      requestId,
      companyDetailsCid,
      employeerDetailsCid
    });

    // Build blockchain transaction with timeout protection
    const serializedTx = await TimeoutOperations.blockchain.transaction(
      sdk.buildInitializeCompanyTx(validatedCompanyId, companyDetailsCid, authority),
      'createCompany.buildTransaction',
      { requestId, companyId: validatedCompanyId, authority: authority.toBase58() }
    );

    logger.info('Company creation transaction built successfully', { 
      requestId,
      companyId: validatedCompanyId,
      companyPDA: companyPDA.toBase58(),
      authority: authority.toBase58()
    });

    res.json({
      success: true,
      data: {
        transaction: serializedTx,
        companyId: validatedCompanyId,
        companyPDA: companyPDA.toBase58(),
        companyDetailsCid,
        employeerDetailsCid
      },
      message: 'Company creation transaction built successfully. Sign and send on frontend.',
      requestId
    });

  } catch (error) {
    logger.error('Company creation failed', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    next(error);
  }
});

/**
 * POST /api/company/update
 * Build transaction to update company details
 */
export const updateCompany = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const context: ValidationContext = {
    operation: 'updateCompany',
    resourceType: 'Company',
    requestId
  };

  logger.info('Starting company update process', { requestId });

  try {
    const {
      companyPubkey,
      authorityPubkey,
      companyDetails,
      isActive
    }: UpdateCompanyRequest = req.body;

    // Validate required fields
    if (!companyPubkey || !authorityPubkey) {
      throw new ValidationError('Missing required fields: companyPubkey, authorityPubkey');
    }

    // Validate public keys
    const { company, authority } = validatePublicKeys({
      company: companyPubkey,
      authority: authorityPubkey
    });

    // Blockchain validations
    await validateCompanyExists(company, context);
    await validateCompanyAuthority(company, authority, context);

    // Build updates object
    const updates: { companyDetails?: string; isActive?: boolean } = {};
    
    if (companyDetails !== undefined) {
      // Upload new details to Arweave if provided with timeout protection
      const companyDetailsCid = await TimeoutOperations.arweave.upload(
        uploadToArweave(JSON.stringify(companyDetails)),
        'updateCompany.companyDetails',
        { requestId, company: company.toBase58() }
      );
      if (!companyDetailsCid) {
        throw new ArweaveError('Failed to upload company details to Arweave');
      }
      validateCidLength(companyDetailsCid, 'companyDetailsCid');
      updates.companyDetails = companyDetailsCid;
    }
    
    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        throw new ValidationError('isActive must be a boolean value', 'isActive');
      }
      updates.isActive = isActive;
    }

    // Build transaction with timeout protection
    const serializedTx = await TimeoutOperations.blockchain.transaction(
      sdk.buildUpdateCompanyTx(company, authority, updates),
      'updateCompany.buildTransaction',
      { requestId, company: company.toBase58(), updates }
    );

    logger.info('Company update transaction built successfully', { 
      requestId,
      company: company.toBase58(),
      updates
    });

    res.json({
      success: true,
      data: {
        transaction: serializedTx,
        updates
      },
      message: 'Company update transaction built successfully. Sign and send on frontend.',
      requestId
    });

  } catch (error) {
    logger.error('Company update failed', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * POST /api/company/authority/propose
 * Build transaction to propose authority transfer (Step 1 of 3)
 */
export const proposeTransferAuthority = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const context: ValidationContext = {
    operation: 'proposeTransferAuthority',
    resourceType: 'Company',
    requestId
  };

  logger.info('Starting authority transfer proposal', { requestId });

  try {
    const {
      companyPubkey,
      currentAuthorityPubkey,
      newAuthorityPubkey
    }: AuthorityTransferRequest = req.body;

    // Validate required fields
    if (!companyPubkey || !currentAuthorityPubkey || !newAuthorityPubkey) {
      throw new ValidationError(
        'Missing required fields: companyPubkey, currentAuthorityPubkey, newAuthorityPubkey'
      );
    }

    // Validate public keys
    const { company, currentAuthority, newAuthority } = validatePublicKeys({
      company: companyPubkey,
      currentAuthority: currentAuthorityPubkey,
      newAuthority: newAuthorityPubkey
    });

    // Validate authorities are different
    if (currentAuthority.equals(newAuthority)) {
      throw new ValidationError(
        'Current authority and new authority cannot be the same',
        'newAuthorityPubkey'
      );
    }

    // Blockchain validations
    await validateCompanyExists(company, context);
    await validateCompanyAuthority(company, currentAuthority, context);
    await validateNoPendingTransfer(company, context);

    // Build transaction with timeout protection
    const serializedTx = await TimeoutOperations.blockchain.transaction(
      sdk.buildProposeTransferAuthorityTx(company, currentAuthority, newAuthority),
      'proposeTransferAuthority.buildTransaction',
      { requestId, company: company.toBase58(), currentAuthority: currentAuthority.toBase58(), newAuthority: newAuthority.toBase58() }
    );

    const [pendingTransferPDA] = sdk.getPendingTransferPDA(company);

    logger.info('Authority transfer proposal transaction built', {
      requestId,
      company: company.toBase58(),
      currentAuthority: currentAuthority.toBase58(),
      newAuthority: newAuthority.toBase58(),
      pendingTransferPDA: pendingTransferPDA.toBase58()
    });

    res.json({
      success: true,
      data: {
        transaction: serializedTx,
        pendingTransferPDA: pendingTransferPDA.toBase58(),
        currentAuthority: currentAuthority.toBase58(),
        proposedAuthority: newAuthority.toBase58()
      },
      message: 'Authority transfer proposal transaction built. Current authority must sign.',
      requestId
    });

  } catch (error) {
    logger.error('Authority transfer proposal failed', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * POST /api/company/authority/accept
 * Build transaction to accept authority transfer (Step 2 of 3)
 */
export const acceptTransferAuthority = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const context: ValidationContext = {
    operation: 'acceptTransferAuthority',
    resourceType: 'Company',
    requestId
  };

  logger.info('Starting authority transfer acceptance', { requestId });

  try {
    const {
      companyPubkey,
      newAuthorityPubkey,
      oldAuthorityPubkey
    }: AcceptTransferRequest = req.body;

    // Validate required fields
    if (!companyPubkey || !newAuthorityPubkey || !oldAuthorityPubkey) {
      throw new ValidationError(
        'Missing required fields: companyPubkey, newAuthorityPubkey, oldAuthorityPubkey'
      );
    }

    // Validate public keys
    const { company, newAuthority, oldAuthority } = validatePublicKeys({
      company: companyPubkey,
      newAuthority: newAuthorityPubkey,
      oldAuthority: oldAuthorityPubkey
    });

    // Verify pending transfer exists and matches
    const pendingTransfer = await validatePendingTransferExists(company, context);
    
    if (pendingTransfer.newAuthority.toBase58() !== newAuthority.toBase58()) {
      throw new ForbiddenError('You are not the proposed new authority for this transfer');
    }

    // Build transaction with timeout protection
    const serializedTx = await TimeoutOperations.blockchain.transaction(
      sdk.buildAcceptTransferAuthorityTx(company, newAuthority, oldAuthority),
      'acceptTransferAuthority.buildTransaction',
      { requestId, company: company.toBase58(), newAuthority: newAuthority.toBase58(), oldAuthority: oldAuthority.toBase58() }
    );

    logger.info('Authority transfer acceptance transaction built', {
      requestId,
      company: company.toBase58(),
      newAuthority: newAuthority.toBase58(),
      oldAuthority: oldAuthority.toBase58()
    });

    res.json({
      success: true,
      data: {
        transaction: serializedTx,
        company: company.toBase58(),
        newAuthority: newAuthority.toBase58(),
        oldAuthority: oldAuthority.toBase58()
      },
      message: 'Authority transfer acceptance transaction built. New authority must sign.',
      requestId
    });

  } catch (error) {
    logger.error('Authority transfer acceptance failed', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * POST /api/company/authority/cancel
 * Build transaction to cancel authority transfer (Step 3 alternative)
 */
export const cancelTransferAuthority = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const context: ValidationContext = {
    operation: 'cancelTransferAuthority',
    resourceType: 'Company',
    requestId
  };

  logger.info('Starting authority transfer cancellation', { requestId });

  try {
    const { companyPubkey, currentAuthorityPubkey } = req.body;

    // Validate required fields
    if (!companyPubkey || !currentAuthorityPubkey) {
      throw new ValidationError('Missing required fields: companyPubkey, currentAuthorityPubkey');
    }

    // Validate public keys
    const { company, currentAuthority } = validatePublicKeys({
      company: companyPubkey,
      currentAuthority: currentAuthorityPubkey
    });

    // Blockchain validations
    await validateCompanyAuthority(company, currentAuthority, context);
    const pendingTransfer = await validatePendingTransferExists(company, context);

    // Build transaction with timeout protection
    const serializedTx = await TimeoutOperations.blockchain.transaction(
      sdk.buildCancelTransferAuthorityTx(company, currentAuthority),
      'cancelTransferAuthority.buildTransaction',
      { requestId, company: company.toBase58(), currentAuthority: currentAuthority.toBase58() }
    );

    logger.info('Authority transfer cancellation transaction built', {
      requestId,
      company: company.toBase58(),
      currentAuthority: currentAuthority.toBase58(),
      cancelledProposedAuthority: pendingTransfer.newAuthority.toBase58()
    });

    res.json({
      success: true,
      data: {
        transaction: serializedTx,
        company: company.toBase58(),
        currentAuthority: currentAuthority.toBase58()
      },
      message: 'Authority transfer cancellation transaction built. Current authority must sign.',
      requestId
    });

  } catch (error) {
    logger.error('Authority transfer cancellation failed', { 
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
 * GET /api/company/:companyId
 * Get company data by ID
 */
export const getCompanyById = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const { companyId } = req.params;

  logger.info('Fetching company by ID', { requestId, companyId });

  try {
    if (!companyId) {
      throw new ValidationError('Company ID is required', 'companyId');
    }

    // Validate ID format
    const validatedCompanyId = validateIdFormat(companyId, 'Company');
    
    // Fetch company data
    const company = await sdk.getCompany(validatedCompanyId);
    if (!company) {
      throw new NotFoundError('Company', validatedCompanyId);
    }

    logger.info('Company fetched successfully', { 
      requestId, 
      companyId: validatedCompanyId,
      isActive: company.isActive
    });

    res.json({
      success: true,
      data: {
        company: {
          ...company,
          authority: company.authority.toBase58(),
          createdAt: company.createdAt.toString(),
          totalEmployees: company.totalEmployees,
          totalCertificates: company.totalCertificates,
          totalTemplates: company.totalTemplates,
          totalAwards: company.totalAwards,
          totalRevoked: company.totalRevoked,
          version: company.version
        }
      },
      requestId
    });

  } catch (error) {
    logger.error('Failed to fetch company by ID', { 
      requestId, 
      companyId, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * GET /api/company/pubkey/:pubkey
 * Get company data by public key
 */
export const getCompanyByPubkey = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const { pubkey } = req.params;

  logger.info('Fetching company by pubkey', { requestId, pubkey });

  try {
    if (!pubkey) {
      throw new ValidationError('Company pubkey is required', 'pubkey');
    }

    // Validate public key
    const companyPubkey = validatePublicKey(pubkey, 'pubkey');
    
    // Fetch company data
    const company = await sdk.getCompanyByPubkey(companyPubkey);
    if (!company) {
      throw new NotFoundError('Company', pubkey);
    }

    logger.info('Company fetched successfully by pubkey', { 
      requestId, 
      pubkey,
      companyId: company.companyId,
      isActive: company.isActive
    });

    res.json({
      success: true,
      data: {
        company: {
          ...company,
          authority: company.authority.toBase58(),
          createdAt: company.createdAt.toString(),
          totalEmployees: company.totalEmployees,
          totalCertificates: company.totalCertificates,
          totalTemplates: company.totalTemplates,
          totalAwards: company.totalAwards,
          totalRevoked: company.totalRevoked,
          version: company.version
        }
      },
      requestId
    });

  } catch (error) {
    logger.error('Failed to fetch company by pubkey', { 
      requestId, 
      pubkey, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * GET /api/company/employees
 * Get all employees of a company (by company public key)
 */
export const getAllEmployees = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const { companyPubkey } = req.query;

  console.log('🔍 DEBUG: getAllEmployees function called');
  console.log('🔍 DEBUG: companyPubkey from query:', companyPubkey);
  console.log('🔍 DEBUG: req.path:', req.path);
  console.log('🔍 DEBUG: req.route.path:', req.route?.path);
  
  logger.info('Fetching all employees for company', { requestId, companyPubkey });

  try {
    if (!companyPubkey || typeof companyPubkey !== 'string') {
      throw new ValidationError('Missing required query parameter: companyPubkey', 'companyPubkey');
    }

    // Validate public key format
    const company = validatePublicKey(companyPubkey, 'companyPubkey');
    
    // Create validation context for this operation
    const context = {
      operation: 'getAllEmployees',
      resourceType: 'Company',
      requestId,
      identifier: company.toBase58()
    };
    
    // Verify company exists using the public key directly
    await validateCompanyExists(company, context);
    
    // Fetch employees
    const employees = await sdk.getAllEmployeesOfCompany(company);

    logger.info('Employees fetched successfully', { 
      requestId, 
      companyPubkey,
      employeeCount: employees.length
    });

    res.json({
      success: true,
      data: {
        companyPubkey,
        count: employees.length,
        employees: employees.map((emp: { pubkey: PublicKey; data: EmployeeData }) => ({
          pubkey: emp.pubkey.toBase58(),
          data: {
            ...emp.data,
            wallet: emp.data.wallet.toBase58(),
            company: emp.data.company.toBase58(),
            totalCertificates: emp.data.totalCertificates,
            totalAwards: emp.data.totalAwards,
            status: emp.data.status,
            statusText: getEmployeeStatusText(emp.data.status),
            version: emp.data.version
          }
        }))
      },
      requestId
    });

  } catch (error) {
    logger.error('Failed to fetch company employees', { 
      requestId, 
      companyPubkey, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * GET /api/company/authority/pending/:companyPubkey
 * Get pending authority transfer information
 */
export const getPendingTransfer = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const { companyPubkey } = req.params;

  logger.info('Fetching pending authority transfer', { requestId, companyPubkey });

  try {
    if (!companyPubkey) {
      throw new ValidationError('Company pubkey is required', 'companyPubkey');
    }

    // Validate public key
    const company = validatePublicKey(companyPubkey, 'companyPubkey');
    
    // Verify company exists
    await validateCompanyExists(company);
    
    // Get pending transfer
    const [pendingTransferPDA] = sdk.getPendingTransferPDA(company);
    const pendingTransfer = await sdk.getPendingTransfer(company);

    if (!pendingTransfer) {
      logger.info('No pending authority transfer found', { requestId, companyPubkey });
      
      return res.json({
        success: true,
        data: {
          companyPubkey,
          hasPendingTransfer: false,
          message: 'No pending authority transfer'
        },
        requestId
      });
    }

    logger.info('Pending authority transfer found', { 
      requestId, 
      companyPubkey,
      newAuthority: pendingTransfer.newAuthority.toBase58()
    });

    res.json({
      success: true,
      data: {
        companyPubkey,
        hasPendingTransfer: true,
        pendingTransfer: {
          pda: pendingTransferPDA.toBase58(),
          company: pendingTransfer.company.toBase58(),
          newAuthority: pendingTransfer.newAuthority.toBase58()
        }
      },
      requestId
    });

  } catch (error) {
    logger.error('Failed to fetch pending authority transfer', { 
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
 * Convert employee status number to human-readable text
 */
function getEmployeeStatusText(status: number): string {
  switch (status) {
    case 0: return 'Pending';
    case 1: return 'Active';
    case 2: return 'Inactive';
    default: return 'Unknown';
  }
}
