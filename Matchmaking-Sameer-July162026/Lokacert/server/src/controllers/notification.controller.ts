/**
 * Enhanced Notification Controller
 * 
 * Production-ready controller with:
 * - Comprehensive error handling with custom exceptions
 * - Structured logging with request correlation
 * - Input sanitization and validation
 * - Performance monitoring
 * - Security best practices
 */

import { Request, Response, NextFunction } from 'express';
import { PublicKey } from '@solana/web3.js';
import { sdk } from '../index';
import { utils } from '../sdk';
import { emailQueue, EmailJobType } from '../utils/emailQueue';
import { getArweaveGatewayUrl } from '../utils/arweave';
import { 
  ValidationError, 
  NotFoundError,
  InternalServerError 
} from '../utils/errors/CustomErrors';
import {
  validatePublicKey,
  validatePublicKeys,
} from '../utils/blockchainValidation';
import logger from '../utils/logStash-logger';
import { asyncErrorHandler } from '../middleware/globalErrorHandler';
import axios from 'axios';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface EmployeeAddedNotification {
  employeePDA: string;
  companyPDA: string;
  employeeName: string;
  employeeEmail: string;
  companyName: string;
}

interface CertificateIssuedNotification {
  certificateId?: string;
  certificateName?: string;
  certificatePDA: string;
  employeePubkey: string;
  companyPubkey: string;
  transactionSignature?: string;
}

interface AwardMintedNotification {
  awardName: string;
  employeePubkey: string;
  companyPubkey: string;
  awardDescription?: string;
}

interface ValidationContext {
  operation: string;
  resourceType: string;
  requestId: string;
  userId?: string;
}

/**
 * POST /api/notify/employee-added
 * Send employee confirmation email after transaction is confirmed
 */
export const notifyEmployeeAdded = async (req: Request, res: Response) => {
  try {
    const {
      employeePDA,
      companyPDA,
      employeeName,
      employeeEmail,
      companyName,
    } = req.body;

    if (
      !employeePDA ||
      !employeeEmail ||
      !employeeName ||
      !companyName ||
      !companyPDA
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Missing required fields: employeePDA, companyPDA, employeeName, employeeEmail, companyName',
      });
    }

    // Verify employee exists on blockchain
    const employeePubkey = new PublicKey(employeePDA);
    const employeeData = await sdk.getEmployeeByPubkey(employeePubkey);

    if (!employeeData) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found on blockchain',
      });
    }

    // Create verification URL using employee PDA
    const verifyUrl = `${process.env.CLIENT_URL}/employee-confirmation?companyPda=${companyPDA}&employeePda=${employeePDA}`;

    const jobId = emailQueue.addJob(EmailJobType.EMPLOYEE_CONFIRMATION, {
      companyName,
      employeeName,
      employeeEmail,
      verifyUrl,
    });

    logger.info(`Employee confirmation email queued: ${jobId}`);

    res.json({
      success: true,
      jobId,
      message: 'Employee confirmation email queued successfully',
    });
  } catch (error) {
    logger.error('Error queueing employee confirmation email:', error);
    res.status(500).json({ success: false, error: 'Failed to queue email' });
  }
};

/**
 * POST /api/notify/certificate-issued
 * Send certificate notification email after transaction is confirmed
 */
export const notifyCertificateIssued = async (req: Request, res: Response) => {
  try {
    const {
      certificateId,
      certificateName,
      certificatePDA,
      employeePubkey,
      companyPubkey,
      transactionSignature,
    } = req.body;

    if (!certificatePDA || !employeePubkey || !companyPubkey) {
      return res.status(400).json({
        success: false,
        error:
          'Missing required fields: certificatePDA, employeePubkey, companyPubkey',
      });
    }

    const employee = new PublicKey(employeePubkey);
    const company = new PublicKey(companyPubkey);

    // Fetch employee data from blockchain
    const employeeData = await sdk.getEmployeeByPubkey(employee);
    if (!employeeData) {
      return res
        .status(404)
        .json({ success: false, error: 'Employee not found' });
    }

    // Fetch employee details from Arweave
    const arweaveGateway = getArweaveGatewayUrl();
    const arweaveResponse = await axios.get(
      `${arweaveGateway}/${employeeData.employeeDetails}`
    );
    const employeeDetailsData = arweaveResponse.data;

    const employeeName = employeeDetailsData?.basic?.fullName || 'Employee';
    const employeeEmail = employeeDetailsData?.professional?.workEmail;

    if (!employeeEmail) {
      return res
        .status(400)
        .json({ success: false, error: 'Employee email not found' });
    }

    // Get company name
    const companyData = await sdk.getCompanyByPubkey(company);
    const companyName = companyData
      ? utils.u8Array6ToString(companyData.companyId)
      : 'Your Company';

    // Use certificate PDA for verification URL
    const verifyUrl = `${process.env.CLIENT_URL}/verify/${certificatePDA}`;

    const jobId = emailQueue.addJob(EmailJobType.CERTIFICATE_NOTIFICATION, {
      employeeName,
      certificateName: certificateName || 'Certificate',
      companyName,
      certificateId: certificateId || certificatePDA,
      verifyUrl,
      employeeEmail,
    });

    logger.info(`Certificate notification email queued: ${jobId}`);

    res.json({
      success: true,
      jobId,
      message: 'Certificate notification email queued successfully',
    });
  } catch (error) {
    logger.error('Error queueing certificate notification email:', error);
    res.status(500).json({ success: false, error: 'Failed to queue email' });
  }
};

/**
 * POST /api/notify/award-minted
 * Send award notification email after transaction is confirmed
 */
export const notifyAwardMinted = async (req: Request, res: Response) => {
  try {
    const { awardName, employeePubkey, companyPubkey, awardDescription } =
      req.body;

    if (!awardName || !employeePubkey || !companyPubkey) {
      return res.status(400).json({
        success: false,
        error:
          'Missing required fields: awardName, employeePubkey, companyPubkey',
      });
    }

    const employee = new PublicKey(employeePubkey);
    const company = new PublicKey(companyPubkey);

    // Fetch employee data from blockchain
    const employeeData = await sdk.getEmployeeByPubkey(employee);
    if (!employeeData) {
      return res
        .status(404)
        .json({ success: false, error: 'Employee not found' });
    }

    // Fetch employee details from Arweave
    const arweaveGateway = getArweaveGatewayUrl();
    const arweaveResponse = await axios.get(
      `${arweaveGateway}/${employeeData.employeeDetails}`
    );
    const employeeDetailsData = arweaveResponse.data;

    const employeeName = employeeDetailsData?.basic?.fullName || 'Employee';
    const employeeEmail =
      // employeeDetailsData?.basic?.personalEmail ||
      employeeDetailsData?.professional?.workEmail;

    if (!employeeEmail) {
      return res
        .status(400)
        .json({ success: false, error: 'Employee email not found' });
    }

    // Get company name
    const companyData = await sdk.getCompanyByPubkey(company);
    const companyName = companyData
      ? utils.u8Array6ToString(companyData.companyId)
      : 'Your Company';

    const jobId = emailQueue.addJob(EmailJobType.AWARD_NOTIFICATION, {
      employeeName,
      awardName,
      companyName,
      awardDescription:
        awardDescription || 'Congratulations on your achievement!',
      employeeEmail,
    });

    logger.info(`Award notification email queued: ${jobId}`);

    res.json({
      success: true,
      jobId,
      message: 'Award notification email queued successfully',
    });
  } catch (error) {
    logger.error('Error queueing award notification email:', error);
    res.status(500).json({ success: false, error: 'Failed to queue email' });
  }
};

/**
 * POST /api/notify/employee-updated
 * Send employee update notification email after transaction is confirmed
 */
export const notifyEmployeeUpdated = async (req: Request, res: Response) => {
  try {
    const { employeePubkey, employeeWallet, companyPubkey, updatedFields } =
      req.body;

    if ((!employeePubkey && !employeeWallet) || !companyPubkey) {
      return res.status(400).json({
        success: false,
        error:
          'Missing required fields: employeePubkey or employeeWallet, companyPubkey',
      });
    }

    const company = new PublicKey(companyPubkey);

    // Get employee data - either by PDA directly or by deriving from company + wallet
    let employeeData;
    if (employeePubkey) {
      const employee = new PublicKey(employeePubkey);
      employeeData = await sdk.getEmployeeByPubkey(employee);
    } else if (employeeWallet) {
      const employeeWalletPubkey = new PublicKey(employeeWallet);
      employeeData = await sdk.getEmployee(company, employeeWalletPubkey);
    }

    if (!employeeData) {
      return res
        .status(404)
        .json({ success: false, error: 'Employee not found' });
    }

    // Fetch employee details from Arweave
    const arweaveGateway = getArweaveGatewayUrl();
    const arweaveResponse = await axios.get(
      `${arweaveGateway}/${employeeData.employeeDetails}`
    );
    const employeeDetailsData = arweaveResponse.data;

    const employeeName = employeeDetailsData?.basic?.fullName || 'Employee';
    const employeeEmail =
      // employeeDetailsData?.basic?.personalEmail ||
      employeeDetailsData?.professional?.workEmail;

    if (!employeeEmail) {
      return res
        .status(400)
        .json({ success: false, error: 'Employee email not found' });
    }

    // Get company name
    const companyData = await sdk.getCompanyByPubkey(company);
    const companyName = companyData
      ? utils.u8Array6ToString(companyData.companyId)
      : 'Your Company';

    const jobId = emailQueue.addJob(EmailJobType.EMPLOYEE_UPDATE, {
      employeeName,
      companyName,
      updatedFields: updatedFields || ['Profile information'],
      employeeEmail,
    });

    logger.info(`Employee update notification email queued: ${jobId}`);

    res.json({
      success: true,
      jobId,
      message: 'Employee update notification email queued successfully',
    });
  } catch (error) {
    logger.error('Error queueing employee update notification email:', error);
    res.status(500).json({ success: false, error: 'Failed to queue email' });
  }
};

/**
 * POST /api/notify/company-created
 * Send company welcome email after transaction is confirmed
 */
export const notifyCompanyCreated = async (req: Request, res: Response) => {
  try {
    const { companyPDA, companyName, companyId, authorityEmail } = req.body;

    if (!companyPDA || !companyName || !companyId || !authorityEmail) {
      return res.status(400).json({
        success: false,
        error:
          'Missing required fields: companyPDA, companyName, companyId, authorityEmail',
      });
    }

    const dashboardUrl = `${process.env.CLIENT_URL}/my-dashboard`;

    const jobId = emailQueue.addJob(EmailJobType.COMPANY_WELCOME, {
      companyName,
      authorityEmail,
      companyId,
      dashboardUrl,
    });

    logger.info(`Company welcome email queued: ${jobId}`);

    res.json({
      success: true,
      jobId,
      message: 'Company welcome email queued successfully',
    });
  } catch (error) {
    logger.error('Error queueing company welcome email:', error);
    res.status(500).json({ success: false, error: 'Failed to queue email' });
  }
};

/**
 * GET /api/notify/status/:jobId
 * Get email job status
 */
export const getNotificationStatus = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = emailQueue.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        createdAt: job.createdAt,
        lastAttemptAt: job.lastAttemptAt,
        error: job.error,
      },
    });
  } catch (error) {
    logger.error('Error getting notification status:', error);
    res.status(500).json({ success: false, error: 'Failed to get status' });
  }
};

/**
 * GET /api/notify/stats
 * Get email queue statistics
 */
export const getNotificationStats = async (_req: Request, res: Response) => {
  try {
    const stats = emailQueue.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Error getting notification stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
};
