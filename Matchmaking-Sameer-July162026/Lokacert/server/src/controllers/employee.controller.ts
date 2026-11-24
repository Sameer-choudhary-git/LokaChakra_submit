/**
 * Enhanced Employee Controller
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
  validateCompanyActive,
  validateCompanyAuthority,
  validateEmployeeExists,
  validateEmployeeActive,
  validateEmployeeInactive,
  validateEmployeeBelongsToCompany,
  EmployeeStatus,
} from '../utils/blockchainValidation';
import logger from '../utils/logStash-logger';
import { asyncErrorHandler } from '../middleware/globalErrorHandler';
import type { EmployeeData } from '../sdk';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface AddEmployeeRequest {
  companyId: string;
  employeeWallet: string;
  employeeId: string;
  authorityPubkey: string;
  employeeDetails?: any;
}

interface ConfirmEmployeeRequest {
  employeePubkey: string;
  employeeWallet: string;
}

interface UpdateEmployeeRequest {
  employeePubkey: string;
  employeeWallet: string;
  employeeDetails?: any;
}

interface UpdateEmployeeStatusRequest {
  employeePubkey: string;
  companyPubkey: string;
  authorityPubkey: string;
  newStatus: number;
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
 * POST /api/employee/add
 * Build transaction to add an employee (by company authority)
 */
export const addEmployee = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const context: ValidationContext = {
    operation: 'addEmployee',
    resourceType: 'Employee',
    requestId
  };

  logger.info('Starting employee addition process', { requestId });

  try {
    const {
      companyId,
      employeeWallet,
      authorityPubkey,
      employeeDetails
    }: AddEmployeeRequest = req.body;

    // Validate required fields
    if (!companyId || !employeeWallet || !authorityPubkey) {
      throw new ValidationError(
        'Missing required fields: companyId, employeeWallet,   authorityPubkey'
      );
    }

    // Validate ID formats
    const validatedCompanyId = validateIdFormat(companyId, 'Company');

    // Validate public keys
    const { employee, authority } = validatePublicKeys({
      employee: employeeWallet,
      authority: authorityPubkey,
    });

    // Derive company PDA from companyId
    const [companyPDA] = sdk.getCompanyPDA(validatedCompanyId);

    // Blockchain validations
    await validateCompanyActive(companyPDA, context);
    await validateCompanyAuthority(companyPDA, authority, context);

    // Check if employee already exists for this company
    const [employeePDA] = sdk.getEmployeePDA(companyPDA, employee);
    const existingEmployee = await sdk.getEmployeeByPubkey(employeePDA);
    if (existingEmployee) {
      throw new ConflictError(`Employee with wallet '${employee.toBase58()}' already exists for this company`);
    }

    logger.info('Employee validation passed, uploading details to Arweave', { 
      requestId, 
      companyId: validatedCompanyId,
      employeePDA: employeePDA.toBase58()
    });

    // Upload employee details to Arweave
    const employeeDetailsCid = await uploadToArweave(JSON.stringify(employeeDetails || {}));
    if (!employeeDetailsCid) {
      throw new ArweaveError('Failed to upload employee details to Arweave');
    }

    logger.info('Employee details uploaded to Arweave, building transaction', {
      requestId,
      employeeDetailsCid
    });

    // Build transaction
    const serializedTx = await sdk.buildAddEmployeeTx(
      validatedCompanyId,
      employee,
      employeeDetailsCid,
      authority
    );

    logger.info('Employee addition transaction built successfully', {
      requestId,
      companyPDA: companyPDA.toBase58(),
      employeeWallet: employee.toBase58(),
      companyId: validatedCompanyId,
      employeePDA: employeePDA.toBase58(),
    });

    res.json({
      success: true,
      data: {
        transaction: serializedTx,
        companyId: validatedCompanyId,
        employeePDA: employeePDA.toBase58(),
        employeeDetailsCid
      },
      message: 'Employee add transaction built successfully. Company authority must sign.',
      requestId
    });
  } catch (error) {
    logger.error('Employee addition failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    next(error);
  }
});

/**
 * POST /api/employee/confirm
 * Build transaction to confirm employee (by employee themselves)
 */
export const confirmEmployee = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const context: ValidationContext = {
    operation: 'confirmEmployee',
    resourceType: 'Employee',
    requestId
  };

  logger.info('Starting employee confirmation process', { requestId });

  try {
    const { employeePubkey, employeeWallet }: ConfirmEmployeeRequest = req.body;

    // Validate required fields
    if (!employeePubkey || !employeeWallet) {
      throw new ValidationError('Missing required fields: employeePubkey, employeeWallet');
    }

    // Validate public keys
    const { employeePDA, wallet } = validatePublicKeys({
      employeePDA: employeePubkey,
      wallet: employeeWallet,
    });

    // Validate employee exists
    const employee = await validateEmployeeExists(employeePDA, context);

    // Verify wallet matches
    if (employee.wallet.toBase58() !== wallet.toBase58()) {
      throw new ForbiddenError('Wallet address does not match employee wallet');
    }

    // Verify employee is in Pending status
    if (employee.status !== EmployeeStatus.Pending) {
      throw new ValidationError(
        'Employee must be in Pending status to confirm',
        'employeeStatus'
      );
    }

    logger.info('Employee confirmation validation passed, building transaction', {
      requestId,
      employeePDA: employeePDA.toBase58(),
      wallet: wallet.toBase58(),
      companyPDA: employee.company.toBase58(),
    });

    // Build transaction - pass company PDA, not employee PDA
    const serializedTx = await sdk.buildConfirmEmployeeTx(employee.company, wallet);

    logger.info('Employee confirmation transaction built successfully', {
      requestId,
      employeePDA: employeePDA.toBase58(),
      wallet: wallet.toBase58(),
    });

    res.json({
      success: true,
      data: {
        transaction: serializedTx,
        employeePDA: employeePDA.toBase58(),
        wallet: wallet.toBase58()
      },
      message: 'Employee confirmation transaction built successfully. Employee must sign.',
      requestId
    });
  } catch (error) {
    logger.error('Employee confirmation failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * POST /api/employee/update
 * Build transaction to update employee details (by employee themselves)
 */
export const updateEmployee = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const context: ValidationContext = {
    operation: 'updateEmployee',
    resourceType: 'Employee',
    requestId
  };

  logger.info('Starting employee update process', { requestId });

  try {
    const { employeePubkey, employeeWallet, employeeDetails }: UpdateEmployeeRequest = req.body;

    // Validate required fields
    if (!employeePubkey || !employeeWallet) {
      throw new ValidationError('Missing required fields: employeePubkey, employeeWallet');
    }

    // Validate public keys
    const { employeePDA, wallet } = validatePublicKeys({
      employeePDA: employeePubkey,
      wallet: employeeWallet,
    });

    // Validate employee exists
    const employee = await validateEmployeeExists(employeePDA, context);

    // Verify wallet matches
    if (employee.wallet.toBase58() !== wallet.toBase58()) {
      throw new ForbiddenError('Wallet address does not match employee wallet');
    }

    // Upload employee details to Arweave
    let employeeDetailsCid = employee.employeeDetails; // Keep existing if not provided
    if (employeeDetails) {
      const newCid = await uploadToArweave(JSON.stringify(employeeDetails));
      if (!newCid) {
        throw new ArweaveError('Failed to upload employee details to Arweave');
      }
      employeeDetailsCid = newCid;

      logger.info('Employee details uploaded to Arweave', {
        requestId,
        employeeDetailsCid
      });
    }

    // Build transaction
    const serializedTx = await sdk.buildUpdateEmployeeTx(
      employee.company,
      wallet,
      wallet, // authority (same as wallet for employee updates)
      employeeDetailsCid
    );

    logger.info('Employee update transaction built successfully', {
      requestId,
      employeePDA: employeePDA.toBase58(),
      wallet: wallet.toBase58(),
    });

    res.json({
      success: true,
      data: {
        transaction: serializedTx,
        employeePDA: employeePDA.toBase58(),
        employeeDetailsCid
      },
      message: 'Employee update transaction built successfully. Employee must sign.',
      requestId
    });
  } catch (error) {
    logger.error('Employee update failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * POST /api/employee/status
 * Build transaction to update employee status (by company authority only)
 */
export const updateEmployeeStatus = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const context: ValidationContext = {
    operation: 'updateEmployeeStatus',
    resourceType: 'Employee',
    requestId
  };

  logger.info('Starting employee status update process', { requestId });

  try {
    const { employeePubkey, companyPubkey, authorityPubkey, newStatus }: UpdateEmployeeStatusRequest = req.body;

    // Validate required fields
    if (!employeePubkey || !companyPubkey || !authorityPubkey || newStatus === undefined) {
      throw new ValidationError(
        'Missing required fields: employeePubkey, companyPubkey, authorityPubkey, newStatus'
      );
    }

    // Validate status value
    if (![EmployeeStatus.Pending, EmployeeStatus.Active, EmployeeStatus.Inactive].includes(newStatus)) {
      throw new ValidationError(
        'Invalid employee status. Must be 0 (Pending), 1 (Active), or 2 (Inactive)',
        'newStatus'
      );
    }

    // Validate public keys
    const { employeePDA, company, authority } = validatePublicKeys({
      employeePDA: employeePubkey,
      company: companyPubkey,
      authority: authorityPubkey,
    });

    // Blockchain validations
    await validateEmployeeBelongsToCompany(employeePDA, company, context);
    await validateCompanyAuthority(company, authority, context);

    logger.info('Employee status update validation passed, building transaction', {
      requestId,
      employeePDA: employeePDA.toBase58(),
      company: company.toBase58(),
      newStatus,
    });

    // Build transaction
    const serializedTx = await sdk.buildUpdateEmployeeStatusTx(
      company,
      employeePDA,
      newStatus,
      authority
    );

    logger.info('Employee status update transaction built successfully', {
      requestId,
      employeePDA: employeePDA.toBase58(),
      company: company.toBase58(),
      newStatus,
    });

    res.json({
      success: true,
      data: {
        transaction: serializedTx,
        employeePDA: employeePDA.toBase58(),
        newStatus,
        newStatusText: getEmployeeStatusText(newStatus)
      },
      message: 'Employee status update transaction built successfully. Company authority must sign.',
      requestId
    });
  } catch (error) {
    logger.error('Employee status update failed', {
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
 * GET /api/employee/:employeeId
 * Get employee profile by ID
 * Query params: companyPubkey (required)
 */
export const getEmployeeProfile = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const { employeeId } = req.params;
  const { companyPubkey } = req.query;

  logger.info('Fetching employee profile by ID', { requestId, employeeId, companyPubkey });

  try {
    // Validate required fields
    if (!employeeId) {
      throw new ValidationError('Employee ID is required', 'employeeId');
    }

    if (!companyPubkey || typeof companyPubkey !== 'string') {
      throw new ValidationError('Company pubkey query parameter is required', 'companyPubkey');
    }

    const validatedEmployeeId = validateIdFormat(employeeId, 'Employee');

    // For getting employee by ID, we need to search for it since PDA requires wallet
    // This is a limitation - we'll need to implement a different approach
    throw new ValidationError('Getting employee by ID not supported. Use pubkey endpoint instead.');
  } catch (error) {
    logger.error('Failed to fetch employee profile', {
      requestId,
      employeeId,
      companyPubkey,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * GET /api/employee/pubkey/:pubkey
 * Get employee profile by public key
 */
export const getEmployeeByPubkey = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const { pubkey } = req.params;

  logger.info('Fetching employee by pubkey', { requestId, pubkey });

  try {
    if (!pubkey) {
      throw new ValidationError('Employee pubkey is required', 'pubkey');
    }

    const employeePDA = validatePublicKey(pubkey, 'pubkey');
    const employee = await validateEmployeeExists(employeePDA);

    logger.info('Employee fetched successfully by pubkey', {
      requestId,
      pubkey,
      status: employee.status
    });

    res.json({
      success: true,
      data: {
        employee: {
          pubkey: employeePDA.toBase58(),
          wallet: employee.wallet.toBase58(),
          company: employee.company.toBase58(),
          employeeDetails: employee.employeeDetails,
          totalCertificates: employee.totalCertificates,
          totalAwards: employee.totalAwards,
          status: employee.status,
          statusText: getEmployeeStatusText(employee.status),
          version: employee.version
        }
      },
      requestId
    });
  } catch (error) {
    logger.error('Failed to fetch employee by pubkey', {
      requestId,
      pubkey,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * GET /api/employee/wallet/:walletAddress
 * Get all company requests/associations for an employee wallet
 */
export const getEmployeeRequests = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const { walletAddress } = req.params;

  logger.info('Fetching employee requests for wallet', { requestId, walletAddress });

  try {
    if (!walletAddress) {
      throw new ValidationError('Wallet address is required', 'walletAddress');
    }

    const wallet = validatePublicKey(walletAddress, 'walletAddress');

    // This functionality is not available in current SDK
    // Would need to implement getAllEmployeesByWallet method or use different approach
    throw new ValidationError('Getting employees by wallet address not currently supported');
  } catch (error) {
    logger.error('Failed to fetch employee requests', {
      requestId,
      walletAddress,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * GET /api/employee/certificates
 * Get all certificates for an employee
 * Query params: employeePubkey (required)
 */
export const getEmployeeCertificates = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const { employeePubkey } = req.query;

  logger.info('Fetching employee certificates', { requestId, employeePubkey });

  try {
    if (!employeePubkey || typeof employeePubkey !== 'string') {
      throw new ValidationError('Missing required query parameter: employeePubkey', 'employeePubkey');
    }

    const employee = validatePublicKey(employeePubkey, 'employeePubkey');
    
    // Verify employee exists
    await validateEmployeeExists(employee);
    
    // Fetch certificates
    const certificates = await sdk.getAllCertificatesOfEmployee(employee);

    logger.info('Employee certificates fetched successfully', {
      requestId,
      employeePubkey,
      certificateCount: certificates.length
    });

    res.json({
      success: true,
      data: {
        employeePubkey,
        count: certificates.length,
        certificates: certificates.map((cert: any) => ({
          pubkey: cert.pubkey.toBase58(),
          data: {
            ...cert.data,
            employee: cert.data.employee.toBase58(),
            company: cert.data.company.toBase58(),
            template: cert.data.template.toBase58(),
            issuedAt: cert.data.issuedAt.toString(),
            expiresAt: cert.data.expiresAt?.toString(),
            status: cert.data.status,
            statusText: getCertificateStatusText(cert.data.status)
          }
        }))
      },
      requestId
    });
  } catch (error) {
    logger.error('Failed to fetch employee certificates', {
      requestId,
      employeePubkey,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * GET /api/employee/awards
 * Get all awards for an employee
 * Query params: employeePubkey (required)
 */
export const getEmployeeAwards = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const { employeePubkey } = req.query;

  logger.info('Fetching employee awards', { requestId, employeePubkey });

  try {
    if (!employeePubkey || typeof employeePubkey !== 'string') {
      throw new ValidationError('Missing required query parameter: employeePubkey', 'employeePubkey');
    }

    const employee = validatePublicKey(employeePubkey, 'employeePubkey');
    
    // Verify employee exists
    await validateEmployeeExists(employee);
    
    // Fetch awards
    const awards = await sdk.getAllAwardsOfEmployee(employee);

    logger.info('Employee awards fetched successfully', {
      requestId,
      employeePubkey,
      awardCount: awards.length
    });

    res.json({
      success: true,
      data: {
        employeePubkey,
        count: awards.length,
        awards: awards.map((award: any) => ({
          pubkey: award.pubkey.toBase58(),
          data: {
            ...award.data,
            employee: award.data.employee.toBase58(),
            company: award.data.company.toBase58(),
            awardType: award.data.awardType.toBase58(),
            mintedAt: award.data.mintedAt.toString()
          }
        }))
      },
      requestId
    });
  } catch (error) {
    logger.error('Failed to fetch employee awards', {
      requestId,
      employeePubkey,
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
    case EmployeeStatus.Pending:
      return 'Pending';
    case EmployeeStatus.Active:
      return 'Active';
    case EmployeeStatus.Inactive:
      return 'Inactive';
    default:
      return 'Unknown';
  }
}

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
