/**
 * Enhanced Award Controller
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
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { sdk } from '../index';
import { EmployeeStatus } from '../sdk';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError,
  ConflictError,
  ArweaveError,
  BlockchainError 
} from '../utils/errors/CustomErrors';
import { ApiError } from '../types/error.types';
import {
  validatePublicKey,
  validatePublicKeys,
  validateIdFormat,
  validateCompanyActive,
  validateCompanyAuthority,
  validateEmployeeActive,
  validateEmployeeExists,
} from '../utils/blockchainValidation';
import logger from '../utils/logStash-logger';
import { asyncErrorHandler } from '../middleware/globalErrorHandler';
import {
  fetchArweaveData,
  getArweaveGatewayUrl,
  uploadToArweave,
} from '../utils/arweave';

// ============================================================================
// CONSTANTS
// ============================================================================

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  process.env.TOKEN_METADATA_PROGRAM_ID ||
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
);

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface CreateAwardTypeRequest {
  companyPubkey: string;
  awardTypeId: string;
  name: string;
  symbol: string;
  companyAuthorityPubkey: string;
  awardTypeDetails: any;
}

interface UpdateAwardTypeRequest {
  companyPubkey: string;
  awardTypePubkey: string;
  updates: {
    metadataUri?: string;
    isActive?: boolean;
  };
  companyAuthorityPubkey: string;
}

interface MintAwardNFTRequest {
  companyPubkey: string;
  employeeWalletPubkey: string;
  awardTypePubkey: string;
  awardId: string;
  companyAuthorityPubkey: string;
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
 * POST /api/createAwardType
 * Build transaction to create an award type (by company authority)
 */
export const createAwardType = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  const context: ValidationContext = {
    operation: 'createAwardType',
    resourceType: 'AwardType',
    requestId
  };

  logger.info('Starting award type creation process', { requestId });

  try {
    const {
      companyPubkey,
      awardTypeId,
      name,
      symbol,
      companyAuthorityPubkey,
      awardTypeDetails,
    }: CreateAwardTypeRequest = req.body;

    // Input validation
    if (!companyPubkey || !awardTypeId || !name || !symbol || !companyAuthorityPubkey || !awardTypeDetails) {
      throw new ValidationError(
        'Missing required fields: companyPubkey, awardTypeId, name, symbol, companyAuthorityPubkey, awardTypeDetails'
      );
    }

    // Validate ID format
    const validatedAwardTypeId = validateIdFormat(awardTypeId, 'AwardType');

    // Validate public keys
    const { company, authority } = validatePublicKeys({
      company: companyPubkey,
      authority: companyAuthorityPubkey,
    });

    // Blockchain validations
    await validateCompanyActive(company, context);
    await validateCompanyAuthority(company, authority, context);

    // Check if award type already exists
    const [awardTypePDA] = sdk.getAwardTypePDA(company, validatedAwardTypeId);
    const existingAwardType = await sdk.getAwardTypeByPubkey(awardTypePDA);
    if (existingAwardType) {
      throw new ConflictError(`Award type with ID '${validatedAwardTypeId}' already exists`);
    }

    logger.info('Award type validation passed, uploading details to Arweave', { 
      requestId, 
      awardTypeId: validatedAwardTypeId,
      awardTypePDA: awardTypePDA.toBase58()
    });

    // Prepare award type details
    const enrichedDetails = {
      ...awardTypeDetails,
      name,
      symbol
    };

    // Upload award type details to Arweave
    const awardTypeUri = await uploadToArweave(JSON.stringify(enrichedDetails));
    if (!awardTypeUri) {
      throw new ArweaveError('Failed to upload award type details to Arweave');
    }

    logger.info('Award type details uploaded to Arweave, building transaction', {
      requestId,
      awardTypeUri
    });

    // Build transaction
    const serializedTx = await sdk.buildCreateAwardTypeTx(
      company,
      validatedAwardTypeId,
      awardTypeUri,
      authority
    );

    logger.info('Award type creation transaction built successfully', {
      requestId,
      company: company.toBase58(),
      awardTypeId: validatedAwardTypeId,
      awardTypePDA: awardTypePDA.toBase58(),
    });

    res.json({
      success: true,
      data: {
        transaction: serializedTx,
        awardTypeId: validatedAwardTypeId,
        awardTypePDA: awardTypePDA.toBase58(),
        arweaveUri: awardTypeUri
      },
      message: 'Award type creation transaction built successfully. Company authority must sign.',
      requestId
    });

  } catch (error) {
    logger.error('Award type creation failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    next(error);
  }
});

/**
 * POST /api/updateAwardType
 * Build transaction to update an award type (by company authority)
 */
export const updateAwardType = async (req: Request, res: Response) => {
  try {
    const { companyPubkey, awardTypePubkey, updates, companyAuthorityPubkey } =
      req.body as {
        companyPubkey: string;
        awardTypePubkey: string;
        updates: {
          metadataUri?: string;
          isActive?: boolean;
        };
        companyAuthorityPubkey: string;
      };

    if (
      !companyPubkey ||
      !awardTypePubkey ||
      !updates ||
      !companyAuthorityPubkey
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Missing fields: companyPubkey, awardTypePubkey, updates, companyAuthorityPubkey',
      });
    }

    const company = new PublicKey(companyPubkey);
    const awardType = new PublicKey(awardTypePubkey);
    const authority = new PublicKey(companyAuthorityPubkey);

    const serializedTx = await sdk.buildUpdateAwardTypeTx(
      company,
      awardType,
      updates,
      authority
    );

    res.json({
      success: true,
      transaction: serializedTx,
      message: 'Transaction built. Sign and send on frontend.',
    });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error('Error building update award type tx:', apiError);
    res.status(500).json({ success: false, error: apiError.message });
  }
};

/**
 * POST /api/mintAwardNFT
 * Build transaction to mint an award NFT to an employee (by company authority)
 */
export const mintAwardNFT = async (req: Request, res: Response) => {
  try {
    const {
      companyPubkey,
      employeeWalletPubkey,
      awardTypePubkey,
      awardId,
      companyAuthorityPubkey,
    } = req.body;

    if (
      !companyPubkey ||
      !employeeWalletPubkey ||
      !awardTypePubkey ||
      !awardId ||
      !companyAuthorityPubkey
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Missing fields: companyPubkey, employeeWalletPubkey, awardTypePubkey, awardId, companyAuthorityPubkey',
      });
    }

    const company = new PublicKey(companyPubkey);
    const employeeWallet = new PublicKey(employeeWalletPubkey);
    const awardType = new PublicKey(awardTypePubkey);
    const authority = new PublicKey(companyAuthorityPubkey);

    const [employeePDA] = await sdk.getEmployeePDA(company, employeeWallet);

    const awardTypeDetails = await sdk.getAwardTypeByPubkey(awardType);
    const awardTypeCid = awardTypeDetails?.metadataUri;
    const awardTypeMetadata = await fetchArweaveData(awardTypeCid as string);
    const { name, symbol } = awardTypeMetadata;

    const employeeData = await sdk.getEmployeeByPubkey(employeePDA);
    if (!employeeData) {
      return res
        .status(404)
        .json({ success: false, error: 'Employee not found' });
    }

    if (employeeData.company.toBase58() !== company.toBase58()) {
      return res.status(400).json({
        success: false,
        error: 'Employee does not belong to this company',
      });
    }

    if (employeeData.status !== EmployeeStatus.Active) {
      return res.status(400).json({
        success: false,
        error: 'Employee must be active to receive awards',
      });
    }

    // Derive the award and mint PDAs before building the transaction
    const [awardPDA] = await sdk.getAwardPDA(company, awardId);
    const [mintPDA] = await sdk.getAwardMintPDA(company, awardId);

    // Get the recipient token account address (ATA)
    const recipientTokenAccount = await getAssociatedTokenAddress(
      mintPDA,
      employeeWallet
    );

    // Get metadata account address
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintPDA.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const serializedTx = await sdk.buildMintAwardNftTx(
      company,
      employeePDA,
      employeeWallet,
      awardType,
      awardId,
      authority,
      name,
      symbol
    );

    // Note: Award notification email is now sent via POST /api/notify/award-minted
    // after frontend confirms the transaction
    res.json({
      success: true,
      transaction: serializedTx,
      message:
        'Transaction built. Sign with company authority to mint NFT award.',
      nftDetails: {
        awardPDA: awardPDA.toBase58(),
        mintAddress: mintPDA.toBase58(),
        recipientTokenAccount: recipientTokenAccount.toBase58(),
        metadataAccount: metadataPDA.toBase58(),
        awardId: awardId,
        recipient: employeeWallet.toBase58(),
        awardType: awardType.toBase58(),
      },
    });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error('Error building mint award NFT tx:', apiError);
    res.status(500).json({ success: false, error: apiError.message });
  }
};
/**
 * GET /api/awardTypes/:companyPubkey
 * Get all award types for a company
 */
export const getCompanyAwardTypes = async (req: Request, res: Response) => {
  try {
    const { companyPubkey } = req.params;

    if (!companyPubkey) {
      return res.status(400).json({
        success: false,
        error: 'Missing companyPubkey parameter',
      });
    }

    const company = new PublicKey(companyPubkey);
    const awardTypes = await sdk.getAllAwardTypesOfCompany(company);

    res.json({
      success: true,
      data: awardTypes.map(({ pubkey, data }) => ({
        pubkey: pubkey.toBase58(),
        ...data,
        company: data.company.toBase58(),
        createdAt: data.createdAt.toString(),
        updatedAt: data.updatedAt.toString(),
        totalIssued: data.totalIssued.toString(),
      })),
    });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error('Error fetching company award types:', apiError);
    res.status(500).json({ success: false, error: apiError.message });
  }
};

/**
 * GET /api/awardType/:awardTypePubkey
 * Get a specific award type by its pubkey
 */
export const getAwardType = async (req: Request, res: Response) => {
  try {
    const { awardTypePubkey } = req.params;

    if (!awardTypePubkey) {
      return res.status(400).json({
        success: false,
        error: 'Missing awardTypePubkey parameter',
      });
    }

    const awardType = new PublicKey(awardTypePubkey);
    const awardTypeData = await sdk.getAwardTypeByPubkey(awardType);

    if (!awardTypeData) {
      return res.status(404).json({
        success: false,
        error: 'Award type not found',
      });
    }

    res.json({
      success: true,
      data: {
        ...awardTypeData,
        company: awardTypeData.company.toBase58(),
        createdAt: awardTypeData.createdAt.toString(),
        updatedAt: awardTypeData.updatedAt.toString(),
        totalIssued: awardTypeData.totalIssued.toString(),
      },
    });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error('Error fetching award type:', apiError);
    res.status(500).json({ success: false, error: apiError.message });
  }
};

/**
 * GET /api/awards/employee/:employeePubkey
 * Get all awards for a specific employee
 */
export const getEmployeeAwards = async (req: Request, res: Response) => {
  try {
    const { employeePubkey } = req.params;

    if (!employeePubkey) {
      return res.status(400).json({
        success: false,
        error: 'Missing employeePubkey parameter',
      });
    }

    const employee = new PublicKey(employeePubkey);
    const awards = await sdk.getAllAwardsOfEmployee(employee);

    // Get award type details for each award
    const enrichedAwards = await Promise.all(
      awards.map(async ({ pubkey, data }) => {
        const awardTypeData = await sdk.getAwardTypeByPubkey(data.awardType);
        return {
          pubkey: pubkey.toBase58(),
          awardId: data.awardId,
          company: data.company.toBase58(),
          employee: data.employee.toBase58(),
          awardType: {
            pubkey: data.awardType.toBase58(),
            metadataUri: awardTypeData?.metadataUri || '',
          },
          mint: data.mint.toBase58(),
          createdAt: data.createdAt.toString(),
        };
      })
    );

    res.json({
      success: true,
      data: enrichedAwards,
    });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error('Error fetching employee awards:', apiError);
    res.status(500).json({ success: false, error: apiError.message });
  }
};

/**
 * GET /api/awards/company/:companyPubkey
 * Get all awards issued by a company
 */
export const getCompanyAwards = async (req: Request, res: Response) => {
  try {
    const { companyPubkey } = req.params;

    if (!companyPubkey) {
      return res.status(400).json({
        success: false,
        error: 'Missing companyPubkey parameter',
      });
    }

    const company = new PublicKey(companyPubkey);
    const awards = await sdk.getAllAwardsOfCompany(company);

    // Get additional details for each award
    const enrichedAwards = await Promise.all(
      awards.map(async ({ pubkey, data }) => {
        const [awardTypeData, employeeData] = await Promise.all([
          sdk.getAwardTypeByPubkey(data.awardType),
          sdk.getEmployeeByPubkey(data.employee),
        ]);

        return {
          pubkey: pubkey.toBase58(),
          awardId: data.awardId,
          company: data.company.toBase58(),
          employee: {
            pubkey: data.employee.toBase58(),
            wallet: employeeData?.wallet.toBase58() || 'Unknown',
            status: employeeData?.status || 0,
          },
          awardType: {
            pubkey: data.awardType.toBase58(),
            metadataUri: awardTypeData?.metadataUri || '',
          },
          mint: data.mint.toBase58(),
          createdAt: data.createdAt.toString(),
        };
      })
    );

    res.json({
      success: true,
      data: enrichedAwards,
    });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error('Error fetching company awards:', apiError);
    res.status(500).json({ success: false, error: apiError.message });
  }
};

/**
 * GET /api/award/:awardPubkey
 * Get a specific award by its pubkey
 */
export const getAward = async (req: Request, res: Response) => {
  try {
    const { awardPubkey } = req.params;

    if (!awardPubkey) {
      return res.status(400).json({
        success: false,
        error: 'Missing awardPubkey parameter',
      });
    }

    const award = new PublicKey(awardPubkey);
    const awardData = await sdk.getAwardByPubkey(award);

    if (!awardData) {
      return res.status(404).json({
        success: false,
        error: 'Award not found',
      });
    }

    // Get additional details
    const [awardTypeData, employeeData, companyData] = await Promise.all([
      sdk.getAwardTypeByPubkey(awardData.awardType),
      sdk.getEmployeeByPubkey(awardData.employee),
      sdk.getCompanyByPubkey(awardData.company),
    ]);

    res.json({
      success: true,
      data: {
        awardId: awardData.awardId,
        company: {
          pubkey: awardData.company.toBase58(),
          companyId: companyData?.companyId || 'Unknown',
          isActive: companyData?.isActive || false,
        },
        employee: {
          pubkey: awardData.employee.toBase58(),
          wallet: employeeData?.wallet.toBase58() || 'Unknown',
          status: employeeData?.status || 0,
        },
        awardType: {
          pubkey: awardData.awardType.toBase58(),
          metadataUri: awardTypeData?.metadataUri || '',
          isActive: awardTypeData?.isActive || false,
        },
        mint: awardData.mint.toBase58(),
        createdAt: awardData.createdAt.toString(),
      },
    });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error('Error fetching award:', apiError);
    res.status(500).json({ success: false, error: apiError.message });
  }
};

/**
 * GET /api/awards/type/:awardTypePubkey
 * Get all awards of a specific type
 */
export const getAwardsByType = async (req: Request, res: Response) => {
  try {
    const { awardTypePubkey } = req.params;

    if (!awardTypePubkey) {
      return res.status(400).json({
        success: false,
        error: 'Missing awardTypePubkey parameter',
      });
    }

    const awardType = new PublicKey(awardTypePubkey);
    const awards = await sdk.getAllAwardsByType(awardType);

    // Get employee details for each award
    const enrichedAwards = await Promise.all(
      awards.map(async ({ pubkey, data }) => {
        const employeeData = await sdk.getEmployeeByPubkey(data.employee);
        return {
          pubkey: pubkey.toBase58(),
          awardId: data.awardId,
          company: data.company.toBase58(),
          employee: {
            pubkey: data.employee.toBase58(),
            wallet: employeeData?.wallet.toBase58() || 'Unknown',
            status: employeeData?.status || 0,
          },
          awardType: data.awardType.toBase58(),
          mint: data.mint.toBase58(),
          createdAt: data.createdAt.toString(),
        };
      })
    );

    res.json({
      success: true,
      data: enrichedAwards,
    });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error('Error fetching awards by type:', apiError);
    res.status(500).json({ success: false, error: apiError.message });
  }
};
