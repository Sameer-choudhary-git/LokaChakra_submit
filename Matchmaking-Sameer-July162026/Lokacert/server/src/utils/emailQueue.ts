import { logger } from './logger';
import { emailService } from './email';

/**
 * Email job types
 */
export enum EmailJobType {
  EMPLOYEE_CONFIRMATION = 'EMPLOYEE_CONFIRMATION',
  CERTIFICATE_NOTIFICATION = 'CERTIFICATE_NOTIFICATION',
  AWARD_NOTIFICATION = 'AWARD_NOTIFICATION',
  EMPLOYEE_UPDATE = 'EMPLOYEE_UPDATE',
  COMPANY_WELCOME = 'COMPANY_WELCOME',
}

/**
 * Email job data types
 */
interface EmployeeConfirmationJobData {
  companyName: string;
  employeeName: string;
  employeeEmail: string;
  verifyUrl: string;
}

interface CertificateNotificationJobData {
  employeeName: string;
  certificateName: string;
  companyName: string;
  certificateId: string;
  verifyUrl: string;
  employeeEmail: string;
}

interface AwardNotificationJobData {
  employeeName: string;
  awardName: string;
  companyName: string;
  awardDescription: string;
  employeeEmail: string;
}

interface EmployeeUpdateJobData {
  employeeName: string;
  companyName: string;
  updatedFields: string[];
  employeeEmail: string;
}

interface CompanyWelcomeJobData {
  companyName: string;
  authorityEmail: string;
  companyId: string;
  dashboardUrl: string;
}

type EmailJobData =
  | EmployeeConfirmationJobData
  | CertificateNotificationJobData
  | AwardNotificationJobData
  | EmployeeUpdateJobData
  | CompanyWelcomeJobData;

/**
 * Email job structure
 */
interface EmailJob {
  id: string;
  type: EmailJobType;
  data: EmailJobData;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  lastAttemptAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

/**
 * Email Queue with retry logic
 * Implements a simple in-memory queue with automatic retry
 * Max 5 attempts per email
 */
class EmailQueue {
  private queue: Map<string, EmailJob> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly RETRY_DELAY_MS = 5000; // 5 seconds between retries
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start processing queue periodically
    this.startProcessing();
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Add a job to the queue
   */
  addJob(type: EmailJobType, data: EmailJobData): string {
    const jobId = this.generateJobId();
    const job: EmailJob = {
      id: jobId,
      type,
      data,
      attempts: 0,
      maxAttempts: this.MAX_ATTEMPTS,
      createdAt: new Date(),
      status: 'pending',
    };

    this.queue.set(jobId, job);
    logger.info(`📧 Email job added to queue: ${jobId} (${type})`);

    // Trigger immediate processing
    this.processQueue();

    return jobId;
  }

  /**
   * Start periodic queue processing
   */
  private startProcessing(): void {
    if (this.processingInterval) return;

    // Process queue every 10 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 10000);

    logger.info('📧 Email queue processor started');
  }

  /**
   * Stop queue processing
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      logger.info('📧 Email queue processor stopped');
    }
  }

  /**
   * Process pending jobs in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      const pendingJobs = Array.from(this.queue.values()).filter(
        (job) => job.status === 'pending'
      );

      for (const job of pendingJobs) {
        await this.processJob(job);
      }
    } catch (error) {
      logger.error('Error processing email queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: EmailJob): Promise<void> {
    job.status = 'processing';
    job.attempts++;
    job.lastAttemptAt = new Date();

    logger.info(
      `📧 Processing email job: ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`
    );

    try {
      let success = false;

      switch (job.type) {
        case EmailJobType.EMPLOYEE_CONFIRMATION:
          success = await emailService.sendEmployeeConfirmation(
            job.data as EmployeeConfirmationJobData
          );
          break;

        case EmailJobType.CERTIFICATE_NOTIFICATION:
          const certData = job.data as CertificateNotificationJobData;
          success = await emailService.sendCertificateNotification(
            {
              employeeName: certData.employeeName,
              certificateName: certData.certificateName,
              companyName: certData.companyName,
              certificateId: certData.certificateId,
              verifyUrl: certData.verifyUrl,
            },
            certData.employeeEmail
          );
          break;

        case EmailJobType.AWARD_NOTIFICATION:
          const awardData = job.data as AwardNotificationJobData;
          success = await emailService.sendAwardNotification(
            {
              employeeName: awardData.employeeName,
              awardName: awardData.awardName,
              companyName: awardData.companyName,
              awardDescription: awardData.awardDescription,
            },
            awardData.employeeEmail
          );
          break;

        case EmailJobType.EMPLOYEE_UPDATE:
          const updateData = job.data as EmployeeUpdateJobData;
          success = await emailService.sendEmployeeUpdateNotification(
            {
              employeeName: updateData.employeeName,
              companyName: updateData.companyName,
              updatedFields: updateData.updatedFields,
            },
            updateData.employeeEmail
          );
          break;

        case EmailJobType.COMPANY_WELCOME:
          success = await emailService.sendCompanyWelcome(
            job.data as CompanyWelcomeJobData
          );
          break;

        default:
          logger.error(`Unknown email job type: ${job.type}`);
          job.status = 'failed';
          job.error = 'Unknown job type';
          return;
      }

      if (success) {
        job.status = 'completed';
        logger.info(`✅ Email job completed: ${job.id}`);

        // Clean up completed jobs after a delay
        setTimeout(() => {
          this.queue.delete(job.id);
        }, 60000); // Remove after 1 minute
      } else {
        throw new Error('Email sending returned false');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ Email job failed: ${job.id} - ${errorMessage}`);

      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        job.error = `Failed after ${job.maxAttempts} attempts: ${errorMessage}`;
        logger.error(
          `📧 Email job permanently failed after ${job.maxAttempts} attempts: ${job.id}`
        );

        // Clean up failed jobs after a delay
        setTimeout(() => {
          this.queue.delete(job.id);
        }, 300000); // Remove after 5 minutes
      } else {
        // Schedule retry
        job.status = 'pending';
        job.error = errorMessage;
        logger.info(
          `📧 Email job will retry in ${this.RETRY_DELAY_MS / 1000}s: ${job.id}`
        );
      }
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): EmailJob | undefined {
    return this.queue.get(jobId);
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const jobs = Array.from(this.queue.values());
    return {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === 'pending').length,
      processing: jobs.filter((j) => j.status === 'processing').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
    };
  }
}

// Export singleton instance
export const emailQueue = new EmailQueue();

// Export types for use in controllers
export type {
  EmployeeConfirmationJobData,
  CertificateNotificationJobData,
  AwardNotificationJobData,
  EmployeeUpdateJobData,
  CompanyWelcomeJobData,
  EmailJob,
};
