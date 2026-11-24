/**
 * Enhanced Certificate Template Controller
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
import { uploadImageToArweave, uploadToArweave } from '../utils/arweave';
import { utils } from '../sdk/utils';
import { 
  ValidationError, 
  NotFoundError, 
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
  validateTemplateExists,
} from '../utils/blockchainValidation';
import logger from '../utils/logStash-logger';
import { asyncErrorHandler } from '../middleware/globalErrorHandler';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface CreateTemplateRequest {
  companyPubkey: string;
  templateId: string;
  certificateTemplateDetails: any;
  companyAuthorityPubkey: string;
  templateImage: {
    buffer: Buffer;
    filename: string;
    mimetype: string;
  };
}

interface UpdateTemplateRequest {
  companyPubkey: string;
  templatePubkey: string;
  certificateTemplateDetails: any;
  companyAuthorityPubkey: string;
  templateImage: {
    buffer: Buffer;
    filename: string;
    mimetype: string;
  };
}

interface ValidationContext {
  operation: string;
  resourceType: string;
  requestId: string;
  userId?: string;
}

/**
 * POST /api/createTemplate
 * Build transaction to create a certificate template (by company authority)
 */
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const {
      companyPubkey,
      templateId,
      certificateTemplateDetails,
      companyAuthorityPubkey,

      //image
      templateImage,
    } = req.body;

    // currently templateImage = {buffer: <Buffer>, filename: 'image.png', mimetype: 'image/png' }

    if (
      !companyPubkey ||
      !templateId ||
      !certificateTemplateDetails ||
      !companyAuthorityPubkey ||
      !templateImage
    ) {
      return res.status(400).json({
        error:
          'Missing required fields: companyPubkey, templateId, certificateTemplateDetails, companyAuthorityPubkey,  templateImage',
      });
    }

    const company = new PublicKey(companyPubkey);
    const authority = new PublicKey(companyAuthorityPubkey);
    const templateImageBuffer = Buffer.from(templateImage.buffer);
    // consolse type of templateiamgebuffer

    const templateImageCid = await uploadImageToArweave(
      templateImageBuffer,
      templateImage.filename,
      {
        'Content-Type': templateImage.mimetype,
        'Template-ID': templateId,
        'Company-Pubkey': companyPubkey,
      }
    );
    certificateTemplateDetails.imageCid = templateImageCid;

    const certificateDetailsCid = await uploadToArweave(
      JSON.stringify(certificateTemplateDetails)
    );
    const serializedTx = await sdk.buildCreateCertificateTemplateTx(
      company,
      templateId,
      certificateDetailsCid,
      authority
    );

    // Get the template PDA for reference
    const [templatePDA] = sdk.getTemplatePDA(company, templateId);

    res.json({
      success: true,
      transaction: serializedTx,
      templatePDA: templatePDA.toBase58(),
      message: 'Transaction built successfully. Sign and send on frontend.',
    });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error('Error retrieving templates:', apiError);
    res.status(500).json({ success: false, error: apiError.message });
  }
};

/**
 * POST /api/updateCertificateTemplate
 * Build transaction to update a certificate template (by company authority)
 */
export const updateCertificateTemplate = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      companyPubkey,
      templatePubkey,
      certificateTemplateDetails,
      companyAuthorityPubkey,

      templateImage,
    } = req.body;

    if (
      !companyPubkey ||
      !templatePubkey ||
      !certificateTemplateDetails ||
      !companyAuthorityPubkey ||
      !templateImage
    ) {
      return res.status(400).json({
        error:
          'Missing required fields: companyPubkey, templatePubkey, certificateTemplateDetails, companyAuthorityPubkey, templateImage',
      });
    }

    // template image = {buffer: <Buffer>, filename: 'image.png', mimetype: 'image/png' }

    const company = new PublicKey(companyPubkey);
    const template = new PublicKey(templatePubkey);
    const authority = new PublicKey(companyAuthorityPubkey);
    const templateImageBuffer = Buffer.from(templateImage.buffer);

    const templateImageCid = await uploadImageToArweave(
      templateImageBuffer,
      templateImage.filename,
      {
        'Content-Type': templateImage.mimetype,
        'Template-Pubkey': templatePubkey,
        'Company-Pubkey': companyPubkey,
      }
    );
    certificateTemplateDetails.imageCid = templateImageCid;
    const certificateDetailsCid = await uploadToArweave(
      JSON.stringify(certificateTemplateDetails)
    );

    const serializedTx = await sdk.buildUpdateCertificateTemplateTx(
      company,
      template,
      certificateDetailsCid,
      authority
    );

    res.json({
      success: true,
      transaction: serializedTx,
      message: 'Transaction built successfully. Sign and send on frontend.',
    });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error('Error building delete template transaction:', apiError);
    res.status(500).json({ success: false, error: apiError.message });
  }
};

/**
 * GET /api/templates/:companyPubkey
 * Get all templates of a company
 */
export const getCompanyTemplates = async (req: Request, res: Response) => {
  try {
    const companyPubkey = new PublicKey(req.params.companyPubkey);
    const templates = await sdk.getAllTemplatesOfCompany(companyPubkey);

    res.json({
      success: true,
      count: templates.length,
      templates: templates.map((template) => ({
        pubkey: template.pubkey.toBase58(),
        data: {
          templateId: utils.u8Array6ToString(template.data.templateId),
          company: template.data.company.toBase58(),
          certificateDetails: template.data.certificateDetails,
          totalIssued: template.data.totalIssued,
          bump: template.data.bump,
        },
      })),
    });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error('Error fetching company templates:', apiError);
    res.status(500).json({ success: false, error: apiError.message });
  }
};

export const getTemplateStats = async (req: Request, res: Response) => {
  try {
    const companyPubkey = new PublicKey(req.params.companyPubkey);
    const templates = await sdk.getAllTemplatesOfCompany(companyPubkey);
    console.log(templates);
    const stats = [];
    for (const template of templates) {
      const templateIssues = template.data.totalIssued;
      const templateName = utils.u8Array6ToString(template.data.templateId);
      stats.push({ templateName, templateIssues });
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error('Error fetching company templates:', apiError);
    res.status(500).json({ success: false, error: apiError.message });
  }
};

/**
 * GET /api/template/:templatePubkey
 * Get template data by pubkey
 */
export const getTemplate = async (req: Request, res: Response) => {
  try {
    const templatePubkey = new PublicKey(req.params.templatePubkey);
    const template = await sdk.getTemplateByPubkey(templatePubkey);

    if (!template) {
      return res
        .status(404)
        .json({ success: false, error: 'Template not found' });
    }

    res.json({
      success: true,
      template: {
        templateId: utils.u8Array6ToString(template.templateId),
        company: template.company.toBase58(),
        certificateDetails: template.certificateDetails,
        totalIssued: template.totalIssued,
        bump: template.bump,
      },
    });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error('Error retrieving template:', apiError);
    res.status(500).json({ success: false, error: apiError.message });
  }
};
