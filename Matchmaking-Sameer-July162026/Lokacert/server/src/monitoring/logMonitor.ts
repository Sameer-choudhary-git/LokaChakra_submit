import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '../utils/logger';
import { BorshEventCoder, Idl } from '@coral-xyz/anchor';
import idl from '../anchor_files/onchain_certification.json';
import { prisma } from '../lib/prisma';
console.log('Prisma client initialized in LogMonitor.');
const eventCoder = new BorshEventCoder(idl as Idl);

interface SaveableLogs {
  signature: string;
  slot: number;
  instruction?: string;
  eventName?: string;
  eventData?: any;
  status: 'success' | 'failed';
  error?: any;
  timestamp: Date;
  programId: string;
}

export class LogMonitor {
  private isMonitoring = false;
  private programId: PublicKey;
  private subscriptionId: number | null = null;

  constructor(
    private connection: Connection,
    programId: string
  ) {
    this.programId = new PublicKey(programId);
  }

  public async startLogMonitoring() {
    if (this.isMonitoring) {
      logger.warn('Log monitoring already running');
      return;
    }

    logger.info(
      '🔍 Starting transaction log monitoring as backup event detection...'
    );
    this.isMonitoring = true;

    try {
      this.subscriptionId = this.connection.onLogs(
        this.programId,
        (logs, context) => {
          this.processTransactionLogs(logs, context);
        },
        'processed'
      );

      logger.info(
        `✅ Log monitoring subscription created with ID: ${this.subscriptionId}`
      );

      return this.subscriptionId;
    } catch (error) {
      logger.error('❌ Failed to start log monitoring:', error);
      this.isMonitoring = false;
      throw error;
    }
  }

  private async processTransactionLogs(logs: any, context: any) {
    const signature = logs.signature;
    const err = logs.err;
    const slot = context.slot;
    const rawLogs: string[] = logs.logs || [];

    if (err) {
      await this.handleFailedTransaction(signature, slot, err, rawLogs);
    } else {
      await this.extractAnchorEvents(rawLogs, signature, slot);
    }
  }

  private async handleFailedTransaction(
    signature: string,
    slot: number,
    error: any,
    rawLogs: string[]
  ) {
    logger.info('Handling failed transaction', {
      signature,
      slot,
      error,
    });

    try {
      const saveableLog: SaveableLogs = {
        signature,
        slot,
        status: 'failed',
        error: JSON.stringify(error),
        timestamp: new Date(),
        programId: this.programId.toString(),
      };

      // Extract instruction if available
      for (const log of rawLogs) {
        if (log.startsWith('Program log: Instruction:')) {
          saveableLog.instruction = log
            .slice('Program log: Instruction: '.length)
            .trim();
          break;
        }
      }

      await this.saveLogToDatabase(saveableLog);

      logger.info(`💾 Failed transaction log saved: ${signature}`);
    } catch (dbError) {
      logger.error('Failed to save failed transaction to database:', dbError);
    }
  }

  private async extractAnchorEvents(
    rawLogs: string[],
    signature: string,
    slot: number
  ) {
    const saveableLog: SaveableLogs = {
      signature,
      slot,
      status: 'success',
      timestamp: new Date(),
      programId: this.programId.toString(),
    };

    try {
      for (let i = 0; i < rawLogs.length; i++) {
        const log = rawLogs[i];

        // Extract instruction
        if (log.startsWith('Program log: Instruction:')) {
          saveableLog.instruction = log
            .slice('Program log: Instruction: '.length)
            .trim();
        }

        // Extract event data
        if (log.startsWith('Program data:')) {
          const base64Data = log.slice('Program data: '.length).trim();

          try {
            const event = eventCoder.decode(base64Data);

            if (event) {
              saveableLog.eventName = event.name;
              saveableLog.eventData = this.sanitizeEventData(event.data);

              logger.info(`📝 Event decoded: ${event.name}`, {
                signature,
                eventData: saveableLog.eventData,
              });
            }
          } catch (decodeError) {
            logger.warn(
              'Anchor decode failed, trying manual parse:',
              decodeError
            );

            // Fallback to manual parsing
            const manualEvent = this.manualEventParse(base64Data);
            if (manualEvent) {
              saveableLog.eventName = manualEvent.name;
              saveableLog.eventData = manualEvent.data;

              logger.info(`📝 Manual parse success: ${manualEvent.name}`, {
                signature,
                eventData: saveableLog.eventData,
              });
            }
          }
        }
      }

      // Only save if we have meaningful data
      if (saveableLog.instruction || saveableLog.eventName) {
        await this.saveLogToDatabase(saveableLog);
        logger.info(`💾 Transaction log saved: ${signature}`);
      }
    } catch (error) {
      logger.error('Error extracting anchor events:', error);
      // Still try to save what we have
      await this.saveLogToDatabase(saveableLog);
    }
  }

  private sanitizeEventData(data: any): any {
    if (data === null || data === undefined) return data;

    // 1. Handle BigInt (native)
    if (typeof data === 'bigint') {
      return data.toString();
    }

    // 2. Handle BN (Big Number) objects from Anchor/Solana
    // These objects usually have 'words' and 'length' properties
    if (
      data.constructor?.name === 'BN' ||
      (typeof data === 'object' &&
        data !== null &&
        'words' in data &&
        Array.isArray(data.words))
    ) {
      // Convert to string to avoid precision loss, JS will coerce to number for math later
      return data.toString();
    }

    // 3. Handle PublicKeys
    if (data.constructor?.name === 'PublicKey' || data.toBase58) {
      return data.toString();
    }

    // 4. Handle Arrays recursively
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeEventData(item));
    }

    // 5. Handle Objects recursively
    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeEventData(value);
      }
      return sanitized;
    }

    return data;
  }

  private manualEventParse(
    base64Data: string
  ): { name: string; data: any } | null {
    try {
      const buffer = Buffer.from(base64Data, 'base64');

      // CompanyInitialized: 8 + 32 + 32 + 6 + 8 + 1 = 87 bytes (added version field)
      if (buffer.length === 87) {
        return {
          name: 'CompanyInitialized',
          data: this.parseCompanyInitialized(buffer),
        };
      }

      // CompanyAuthorityTransferProposed: 8 + 32 + 32 + 32 + 8 = 112 bytes
      if (buffer.length === 112) {
        // Need to differentiate between similar sized events
        // Try parsing as different events based on context
        const possibleEvents = [
          { name: 'CompanyAuthorityTransferProposed', parser: this.parseCompanyAuthorityTransferProposed.bind(this) },
          { name: 'CompanyAuthorityTransferred', parser: this.parseCompanyAuthorityTransferred.bind(this) },
          { name: 'EmployeeAdded', parser: this.parseEmployeeAdded.bind(this) },
          { name: 'EmployeeConfirmed', parser: this.parseEmployeeConfirmed.bind(this) },
          { name: 'CertificateRevoked', parser: this.parseCertificateRevoked.bind(this) },
        ];
        
        // Try each parser and return the first successful one
        for (const event of possibleEvents) {
          try {
            return {
              name: event.name,
              data: event.parser(buffer),
            };
          } catch (e) {
            continue;
          }
        }
      }

      // CompanyAuthorityTransferCancelled: 8 + 32 + 32 + 8 = 80 bytes
      if (buffer.length === 80) {
        // Could be CompanyAuthorityTransferCancelled, EmployeeDetailsUpdated, or AwardTypeUpdated
        const possibleEvents = [
          { name: 'CompanyAuthorityTransferCancelled', parser: this.parseCompanyAuthorityTransferCancelled.bind(this) },
          { name: 'EmployeeDetailsUpdated', parser: this.parseEmployeeDetailsUpdated.bind(this) },
          { name: 'AwardTypeUpdated', parser: this.parseAwardTypeUpdated.bind(this) },
          { name: 'CompanyUpdated', parser: this.parseCompanyUpdated.bind(this) },
        ];
        
        for (const event of possibleEvents) {
          try {
            return {
              name: event.name,
              data: event.parser(buffer),
            };
          } catch (e) {
            continue;
          }
        }
      }

      // CertificateIssued: 8 + 32 + 32 + 32 + 6 + 8 = 118 bytes
      if (buffer.length === 118) {
        return {
          name: 'CertificateIssued',
          data: this.parseCertificateIssued(buffer),
        };
      }

      // EmployeeStatusUpdated: 8 + 32 + 32 + 1 + 1 + 8 = 82 bytes
      if (buffer.length === 82) {
        return {
          name: 'EmployeeStatusUpdated',
          data: this.parseEmployeeStatusUpdated(buffer),
        };
      }

      // CertificateTemplateCreated/Updated: 8 + 32 + 32 + 6 + 8 = 86 bytes
      if (buffer.length === 86) {
        // Could be CertificateTemplateCreated, CertificateTemplateUpdated, or AwardTypeCreated
        const possibleEvents = [
          { name: 'CertificateTemplateCreated', parser: this.parseCertificateTemplateCreated.bind(this) },
          { name: 'CertificateTemplateUpdated', parser: this.parseCertificateTemplateUpdated.bind(this) },
          { name: 'AwardTypeCreated', parser: this.parseAwardTypeCreated.bind(this) },
        ];
        
        for (const event of possibleEvents) {
          try {
            return {
              name: event.name,
              data: event.parser(buffer),
            };
          } catch (e) {
            continue;
          }
        }
      }

      // AwardMinted: 8 + 32 + 32 + 32 + 32 + 32 + 6 + 8 = 182 bytes
      if (buffer.length === 182) {
        return {
          name: 'AwardMinted',
          data: this.parseAwardMinted(buffer),
        };
      }

      // EmployeeClosed: 8 + 32 + 32 + 32 + 8 = 112 bytes (same as several others)
      // CertificateClosed: 8 + 32 + 32 + 32 + 8 = 112 bytes

      logger.warn(`Unknown event buffer length: ${buffer.length}`);
      return null;
    } catch (error) {
      logger.error('Manual parse failed:', error);
      return null;
    }
  }

  // Event Parsers
  private parseCompanyInitialized(buffer: Buffer) {
    let offset = 8; // Skip discriminator
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const authority = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const companyId = Array.from(buffer.slice(offset, offset + 6));
    offset += 6;
    const timestamp = buffer.readBigInt64LE(offset);
    offset += 8;
    const version = buffer.readUInt8(offset);

    return {
      company: company.toString(),
      authority: authority.toString(),
      companyId: companyId,
      timestamp: Number(timestamp),
      version: version,
    };
  }

  private parseCompanyAuthorityTransferProposed(buffer: Buffer) {
    let offset = 8;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const currentAuthority = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const pendingAuthority = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const timestamp = buffer.readBigInt64LE(offset);

    return {
      company: company.toString(),
      currentAuthority: currentAuthority.toString(),
      pendingAuthority: pendingAuthority.toString(),
      timestamp: Number(timestamp),
    };
  }

  private parseCompanyAuthorityTransferred(buffer: Buffer) {
    let offset = 8;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const oldAuthority = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const newAuthority = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const timestamp = buffer.readBigInt64LE(offset);

    return {
      company: company.toString(),
      oldAuthority: oldAuthority.toString(),
      newAuthority: newAuthority.toString(),
      timestamp: Number(timestamp),
    };
  }

  private parseCompanyAuthorityTransferCancelled(buffer: Buffer) {
    let offset = 8;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const authority = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const timestamp = buffer.readBigInt64LE(offset);

    return {
      company: company.toString(),
      authority: authority.toString(),
      timestamp: Number(timestamp),
    };
  }

  private parseCompanyUpdated(buffer: Buffer) {
    let offset = 8;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const timestamp = buffer.readBigInt64LE(offset);

    return {
      company: company.toString(),
      timestamp: Number(timestamp),
    };
  }

  private parseEmployeeAdded(buffer: Buffer) {
    let offset = 8;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const employee = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const employeeWallet = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const timestamp = buffer.readBigInt64LE(offset);

    return {
      company: company.toString(),
      employee: employee.toString(),
      employeeWallet: employeeWallet.toString(),
      timestamp: Number(timestamp),
    };
  }

  private parseEmployeeConfirmed(buffer: Buffer) {
    let offset = 8;
    const employee = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const employeeWallet = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const timestamp = buffer.readBigInt64LE(offset);

    return {
      employee: employee.toString(),
      company: company.toString(),
      employeeWallet: employeeWallet.toString(),
      timestamp: Number(timestamp),
    };
  }

  private parseEmployeeStatusUpdated(buffer: Buffer) {
    let offset = 8;
    const employee = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const oldStatus = buffer.readUInt8(offset);
    offset += 1;
    const newStatus = buffer.readUInt8(offset);
    offset += 1;
    const timestamp = buffer.readBigInt64LE(offset);

    const statusMap = ['Pending', 'Active', 'Inactive'];

    return {
      employee: employee.toString(),
      company: company.toString(),
      oldStatus: statusMap[oldStatus] || 'Unknown',
      newStatus: statusMap[newStatus] || 'Unknown',
      timestamp: Number(timestamp),
    };
  }

  private parseEmployeeDetailsUpdated(buffer: Buffer) {
    let offset = 8;
    const employee = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const timestamp = buffer.readBigInt64LE(offset);

    return {
      employee: employee.toString(),
      company: company.toString(),
      timestamp: Number(timestamp),
    };
  }

  private parseCertificateIssued(buffer: Buffer) {
    let offset = 8;
    const certificate = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const employee = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const certificateId = Array.from(buffer.slice(offset, offset + 6));
    offset += 6;
    const timestamp = buffer.readBigInt64LE(offset);

    return {
      certificate: certificate.toString(),
      company: company.toString(),
      employee: employee.toString(),
      certificateId: certificateId,
      timestamp: Number(timestamp),
    };
  }

  private parseCertificateRevoked(buffer: Buffer) {
    let offset = 8;
    const certificate = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const employee = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const timestamp = buffer.readBigInt64LE(offset);

    return {
      certificate: certificate.toString(),
      company: company.toString(),
      employee: employee.toString(),
      timestamp: Number(timestamp),
    };
  }

  private parseCertificateTemplateCreated(buffer: Buffer) {
    let offset = 8;
    const template = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const templateId = Array.from(buffer.slice(offset, offset + 6));
    offset += 6;
    const timestamp = buffer.readBigInt64LE(offset);

    return {
      template: template.toString(),
      company: company.toString(),
      templateId: templateId,
      timestamp: Number(timestamp),
    };
  }

  private parseCertificateTemplateUpdated(buffer: Buffer) {
    let offset = 8;
    const template = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const templateId = Array.from(buffer.slice(offset, offset + 6));
    offset += 6;
    const timestamp = buffer.readBigInt64LE(offset);

    return {
      template: template.toString(),
      company: company.toString(),
      templateId: templateId,
      timestamp: Number(timestamp),
    };
  }

  private parseAwardTypeCreated(buffer: Buffer) {
    let offset = 8;
    const awardType = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const awardTypeId = Array.from(buffer.slice(offset, offset + 6));
    offset += 6;
    const timestamp = buffer.readBigInt64LE(offset);

    return {
      awardType: awardType.toString(),
      company: company.toString(),
      awardTypeId: awardTypeId,
      timestamp: Number(timestamp),
    };
  }

  private parseAwardTypeUpdated(buffer: Buffer) {
    let offset = 8;
    const awardType = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const timestamp = buffer.readBigInt64LE(offset);

    return {
      awardType: awardType.toString(),
      company: company.toString(),
      timestamp: Number(timestamp),
    };
  }

  private parseAwardMinted(buffer: Buffer) {
    let offset = 8;
    const award = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const employee = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const awardType = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const mint = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const awardId = Array.from(buffer.slice(offset, offset + 6));
    offset += 6;
    const timestamp = buffer.readBigInt64LE(offset);

    return {
      award: award.toString(),
      company: company.toString(),
      employee: employee.toString(),
      awardType: awardType.toString(),
      mint: mint.toString(),
      awardId: awardId,
      timestamp: Number(timestamp),
    };
  }

  private parseEmployeeClosed(buffer: Buffer) {
    let offset = 8;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const employee = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const authority = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const timestamp = buffer.readBigInt64LE(offset);

    return {
      company: company.toString(),
      employee: employee.toString(),
      authority: authority.toString(),
      timestamp: Number(timestamp),
    };
  }

  private parseCertificateClosed(buffer: Buffer) {
    let offset = 8;
    const company = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const certificate = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const authority = new PublicKey(buffer.slice(offset, offset + 32));
    offset += 32;
    const timestamp = buffer.readBigInt64LE(offset);

    return {
      company: company.toString(),
      certificate: certificate.toString(),
      authority: authority.toString(),
      timestamp: Number(timestamp),
    };
  }

  private async saveLogToDatabase(log: SaveableLogs) {
    try {
      await prisma.transactionLog.create({
        data: {
          signature: log.signature,
          slot: log.slot,
          programId: log.programId,
          instruction: log.instruction,
          eventName: log.eventName,
          eventData: log.eventData ? JSON.stringify(log.eventData) : null,
          status: log.status,
          error: log.error,
          timestamp: log.timestamp,
        },
      });

      // If this is a specific event, also save to dedicated tables
      if (log.eventName && log.eventData && log.status === 'success') {
        await this.saveEventToSpecificTable(log);
      }
    } catch (error) {
      logger.error('Failed to save log to database:', error);
      throw error;
    }
  }

  private async saveEventToSpecificTable(log: SaveableLogs) {
    try {
      const data = log.eventData;

      switch (log.eventName) {
        // ============================================================
        // COMPANY EVENTS
        // ============================================================
        case 'CompanyInitialized':
          await prisma.company.upsert({
            where: { publicKey: data.company },
            create: {
              publicKey: data.company,
              authority: data.authority,
              companyId: JSON.stringify(data.companyId || data.company_id),
              isActive: true,
              version: data.version, // NEW: Capture version
              createdTxSignature: log.signature,
              createdAt: new Date(data.timestamp * 1000),
            },
            update: {
              authority: data.authority,
            },
          });
          logger.info(`✅ Company saved: ${data.company}`);
          break;

        // NEW: Handle Transfer Proposal
        case 'CompanyAuthorityTransferProposed':
          await prisma.transferRequest.create({
            data: {
              companyPublicKey: data.company,
              currentAuthority: data.currentAuthority || data.current_authority,
              newAuthority: data.pendingAuthority || data.pending_authority,
              status: 'Pending',
              createdTxSignature: log.signature,
              createdAt: new Date(data.timestamp * 1000),
            },
          });
          logger.info(
            `✅ Authority transfer proposed for company: ${data.company}`
          );
          break;

        case 'CompanyAuthorityTransferred':
          // 1. Update Company Authority
          await prisma.company.update({
            where: { publicKey: data.company },
            data: {
              authority: data.newAuthority || data.new_authority,
              updatedAt: new Date(data.timestamp * 1000),
            },
          });

          // 2. Mark Transfer Requests as Accepted (or delete them)
          await prisma.transferRequest.updateMany({
            where: {
              companyPublicKey: data.company,
              status: 'Pending',
            },
            data: {
              status: 'Accepted',
              updatedAt: new Date(data.timestamp * 1000),
            },
          });
          logger.info(`✅ Authority transferred for company: ${data.company}`);
          break;

        case 'CompanyAuthorityTransferCancelled':
          // Mark Transfer Requests as Cancelled
          await prisma.transferRequest.updateMany({
            where: {
              companyPublicKey: data.company,
              status: 'Pending',
            },
            data: {
              status: 'Cancelled',
              updatedAt: new Date(data.timestamp * 1000),
            },
          });
          logger.info(`✅ Authority transfer cancelled for company: ${data.company}`);
          break;

        case 'CompanyUpdated':
          await prisma.company.update({
            where: { publicKey: data.company },
            data: {
              updatedAt: new Date(data.timestamp * 1000),
            },
          });
          logger.info(`✅ Company updated: ${data.company}`);
          break;

        // ============================================================
        // EMPLOYEE EVENTS
        // ============================================================
        case 'EmployeeAdded':
          await prisma.employee.upsert({
            where: { publicKey: data.employee },
            create: {
              publicKey: data.employee,
              wallet: data.employeeWallet || data.employee_wallet,
              companyPublicKey: data.company,
              status: 'Pending',
              version: 1, // Default, as event doesn't emit it
              createdTxSignature: log.signature,
              createdAt: new Date(data.timestamp * 1000),
            },
            update: {
              wallet: data.employeeWallet || data.employee_wallet,
            },
          });
          logger.info(`✅ Employee added: ${data.employee}`);
          break;

        case 'EmployeeConfirmed':
          await prisma.employee.update({
            where: { publicKey: data.employee },
            data: {
              status: 'Active',
              updatedAt: new Date(data.timestamp * 1000),
            },
          });
          logger.info(`✅ Employee confirmed: ${data.employee}`);
          break;

        case 'EmployeeStatusUpdated':
          await prisma.employee.update({
            where: { publicKey: data.employee },
            data: {
              status: data.newStatus || data.new_status,
              updatedAt: new Date(data.timestamp * 1000),
            },
          });
          logger.info(
            `✅ Employee status updated: ${data.employee} -> ${data.newStatus || data.new_status}`
          );
          break;

        case 'EmployeeDetailsUpdated':
          await prisma.employee.update({
            where: { publicKey: data.employee },
            data: {
              updatedAt: new Date(data.timestamp * 1000),
            },
          });
          logger.info(`✅ Employee details updated: ${data.employee}`);
          break;

        // NEW: Handle Employee Closed
        case 'EmployeeClosed':
          await prisma.employee.update({
            where: { publicKey: data.employee },
            data: {
              status: 'Closed', // Or 'Inactive' depending on preference
              updatedAt: new Date(data.timestamp * 1000),
            },
          });
          logger.info(`✅ Employee closed: ${data.employee}`);
          break;

        // ============================================================
        // CERTIFICATE EVENTS
        // ============================================================
        case 'CertificateIssued':
          await prisma.certificate.create({
            data: {
              publicKey: data.certificate,
              certificateId: JSON.stringify(
                data.certificateId || data.certificate_id
              ),
              companyPublicKey: data.company,
              employeePublicKey: data.employee,
              status: 'Active',
              version: 1, // Default
              issuedTxSignature: log.signature,
              createdAt: new Date(data.timestamp * 1000),
            },
          });
          logger.info(`✅ Certificate issued: ${data.certificate}`);
          break;

        case 'CertificateRevoked':
          await prisma.certificate.update({
            where: { publicKey: data.certificate },
            data: {
              status: 'Revoked',
              updatedAt: new Date(data.timestamp * 1000),
            },
          });
          logger.info(`✅ Certificate revoked: ${data.certificate}`);
          break;

        // NEW: Handle Certificate Closed
        case 'CertificateClosed':
          await prisma.certificate.update({
            where: { publicKey: data.certificate },
            data: {
              status: 'Closed',
              updatedAt: new Date(data.timestamp * 1000),
            },
          });
          logger.info(`✅ Certificate closed: ${data.certificate}`);
          break;

        // ============================================================
        // TEMPLATE EVENTS
        // ============================================================
        case 'CertificateTemplateCreated':
          await prisma.certificateTemplate.create({
            data: {
              publicKey: data.template,
              templateId: JSON.stringify(data.templateId || data.template_id),
              companyPublicKey: data.company,
              version: 1,
              createdTxSignature: log.signature,
              createdAt: new Date(data.timestamp * 1000),
            },
          });
          logger.info(`✅ Template created: ${data.template}`);
          break;

        case 'CertificateTemplateUpdated':
          await prisma.certificateTemplate.update({
            where: { publicKey: data.template },
            data: {
              updatedAt: new Date(data.timestamp * 1000),
            },
          });
          logger.info(`✅ Template updated: ${data.template}`);
          break;

        // ============================================================
        // AWARD EVENTS
        // ============================================================
        case 'AwardTypeCreated':
          await prisma.awardType.create({
            data: {
              publicKey: data.awardType || data.award_type,
              awardTypeId: JSON.stringify(
                data.awardTypeId || data.award_type_id
              ),
              companyPublicKey: data.company,
              isActive: true,
              version: 1,
              createdTxSignature: log.signature,
              createdAt: new Date(data.timestamp * 1000),
            },
          });
          logger.info(
            `✅ Award type created: ${data.awardType || data.award_type}`
          );
          break;

        case 'AwardTypeUpdated':
          await prisma.awardType.update({
            where: { publicKey: data.awardType || data.award_type },
            data: {
              updatedAt: new Date(data.timestamp * 1000),
            },
          });
          logger.info(
            `✅ Award type updated: ${data.awardType || data.award_type}`
          );
          break;

        case 'AwardMinted':
          await prisma.award.create({
            data: {
              publicKey: data.award,
              awardId: JSON.stringify(data.awardId || data.award_id),
              companyPublicKey: data.company,
              employeePublicKey: data.employee,
              awardTypePublicKey: data.awardType || data.award_type,
              mint: data.mint,
              version: 1,
              mintedTxSignature: log.signature,
              createdAt: new Date(data.timestamp * 1000),
            },
          });
          logger.info(`✅ Award minted: ${data.award}, Mint: ${data.mint}`);
          break;

        default:
          logger.warn(`No specific table handler for event: ${log.eventName}`);
      }
    } catch (error) {
      logger.error(`Failed to save ${log.eventName} to specific table:`, error);
      // Don't throw - we already saved to the general log table
    }
  }


  public async stop() {
    logger.info('🛑 Stopping log monitoring...');
    this.isMonitoring = false;

    if (this.subscriptionId !== null) {
      try {
        await this.connection.removeOnLogsListener(this.subscriptionId);
        logger.info(`✅ Removed log subscription: ${this.subscriptionId}`);
      } catch (error) {
        logger.error('Failed to remove log subscription:', error);
      }
      this.subscriptionId = null;
    }
  }

  public getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      programId: this.programId.toString(),
      subscriptionId: this.subscriptionId,
    };
  }

  public async getRecentLogs(limit: number = 50) {
    return await prisma.transactionLog.findMany({
      where: { programId: this.programId.toString() },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  public async getLogsByEvent(eventName: string, limit: number = 50) {
    return await prisma.transactionLog.findMany({
      where: {
        programId: this.programId.toString(),
        eventName: eventName,
        status: 'success',
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  public async getLogsByCompany(companyPublicKey: string, limit: number = 50) {
    return await prisma.transactionLog.findMany({
      where: {
        programId: this.programId.toString(),
        status: 'success',
        eventData: {
          contains: companyPublicKey,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}