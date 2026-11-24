/**
 * Enhanced Blockchain Validation Utility
 * 
 * Production-ready validation functions for blockchain-related checks
 * Based on constraints from z.rs Solana contract
 * 
 * Features:
 * - Comprehensive error handling with custom exceptions
 * - Logstash logging integration
 * - Performance monitoring
 * - Input sanitization
 * - Type safety
 * - Circuit breaker pattern for external calls
 */

import { PublicKey } from '@solana/web3.js';
import { sdk } from '../index';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError, 
  BlockchainError,
  ConflictError,
  ServiceUnavailableError 
} from './errors/CustomErrors';
import { 
  CID_MAX_SIZE, 
  NAME_MAX_SIZE, 
  URI_MAX_SIZE, 
  SYMBOL_MAX_SIZE 
} from '../utils/contanst';
import logger from '../utils/logStash-logger';

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

/**
 * Employee status enum (from z.rs contract)
 */
export enum EmployeeStatus {
  Pending = 0,
  Active = 1,
  Inactive = 2,
}

/**
 * Certificate status enum (from z.rs contract)
 */
export enum CertificateStatus {
  Active = 0,
  Revoked = 1,
  Expired = 2,
}

/**
 * Award type status enum
 */
export enum AwardTypeStatus {
  Inactive = 0,
  Active = 1,
}

/**
 * Validation context for enhanced logging
 */
interface ValidationContext {
  operation: string;
  resourceType: string;
  identifier?: string;
  userId?: string;
  requestId?: string;
}

/**
 * Circuit breaker state for external calls
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 30000; // 30 seconds

  async execute<T>(operation: () => Promise<T>, context: ValidationContext): Promise<T> {
    if (this.isOpen()) {
      logger.warn('Circuit breaker is OPEN - rejecting request', { context });
      throw new ServiceUnavailableError('Blockchain service temporarily unavailable');
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    return this.failures >= this.threshold && 
           (Date.now() - this.lastFailureTime) < this.timeout;
  }

  private onSuccess(): void {
    this.failures = 0;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }
}

const circuitBreaker = new CircuitBreaker();

// ============================================================================
// INPUT SANITIZATION & VALIDATION
// ============================================================================

/**
 * Sanitize and validate string input
 */
function sanitizeString(input: unknown, fieldName: string): string {
  if (typeof input !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName);
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
  }

  // Remove potential XSS characters
  const sanitized = trimmed.replace(/[<>\"'&]/g, '');
  if (sanitized !== trimmed) {
    logger.warn('Input sanitization detected potentially malicious content', { 
      fieldName, 
      original: trimmed, 
      sanitized 
    });
  }

  return sanitized;
}

/**
 * Validate numeric input with range checking
 */
function validateNumber(input: unknown, fieldName: string, min?: number, max?: number): number {
  const num = Number(input);
  if (isNaN(num) || !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be a valid integer`, fieldName);
  }

  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName);
  }

  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`, fieldName);
  }

  return num;
}

// ============================================================================
// STRING LENGTH VALIDATIONS (Based on z.rs contract constraints)
// ============================================================================

/**
 * Validate CID length (max 43 characters)
 * Contract error: CidTooLong (6000)
 */
export function validateCidLength(cid: unknown, fieldName: string = 'cid'): string {
  const sanitized = sanitizeString(cid, fieldName);
  
  if (sanitized.length > CID_MAX_SIZE) {
    logger.warn('CID length validation failed', { 
      fieldName, 
      length: sanitized.length, 
      maxSize: CID_MAX_SIZE 
    });
    throw new ValidationError(
      `${fieldName} is too long (max ${CID_MAX_SIZE} characters)`,
      fieldName
    );
  }

  return sanitized;
}

/**
 * Validate name length (max 32 characters)
 * Contract error: NameTooLong (6001)
 */
export function validateNameLength(name: unknown, fieldName: string = 'name'): string {
  const sanitized = sanitizeString(name, fieldName);
  
  if (sanitized.length > NAME_MAX_SIZE) {
    logger.warn('Name length validation failed', { 
      fieldName, 
      length: sanitized.length, 
      maxSize: NAME_MAX_SIZE 
    });
    throw new ValidationError(
      `${fieldName} is too long (max ${NAME_MAX_SIZE} characters)`,
      fieldName
    );
  }

  return sanitized;
}

/**
 * Validate URI length (max 43 characters)
 * Contract error: UriTooLong (6002)
 */
export function validateUriLength(uri: unknown, fieldName: string = 'uri'): string {
  const sanitized = sanitizeString(uri, fieldName);
  
  if (sanitized.length > URI_MAX_SIZE) {
    logger.warn('URI length validation failed', { 
      fieldName, 
      length: sanitized.length, 
      maxSize: URI_MAX_SIZE 
    });
    throw new ValidationError(
      `${fieldName} is too long (max ${URI_MAX_SIZE} characters)`,
      fieldName
    );
  }

  return sanitized;
}

/**
 * Validate symbol length (max 10 characters)
 * Contract error: SymbolTooLong (6003)
 */
export function validateSymbolLength(symbol: unknown, fieldName: string = 'symbol'): string {
  const sanitized = sanitizeString(symbol, fieldName);
  
  if (sanitized.length > SYMBOL_MAX_SIZE) {
    logger.warn('Symbol length validation failed', { 
      fieldName, 
      length: sanitized.length, 
      maxSize: SYMBOL_MAX_SIZE 
    });
    throw new ValidationError(
      `${fieldName} is too long (max ${SYMBOL_MAX_SIZE} characters)`,
      fieldName
    );
  }

  return sanitized;
}

/**
 * Validate ID format (must be exactly 6 characters)
 */
export function validateIdFormat(id: unknown, resourceType: string): string {
  const sanitized = sanitizeString(id, `${resourceType.toLowerCase()}Id`);
  
  if (sanitized.length !== 6) {
    logger.warn('ID format validation failed', { 
      resourceType, 
      id: sanitized, 
      length: sanitized.length 
    });
    throw new ValidationError(
      `${resourceType} ID must be exactly 6 characters`,
      `${resourceType.toLowerCase()}Id`
    );
  }

  // Ensure alphanumeric characters only
  if (!/^[a-zA-Z0-9]{6}$/.test(sanitized)) {
    throw new ValidationError(
      `${resourceType} ID must contain only alphanumeric characters`,
      `${resourceType.toLowerCase()}Id`
    );
  }
  console.log('Validated ID:', sanitized);
  return sanitized;
}

// ============================================================================
// PUBLICKEY VALIDATIONS
// ============================================================================

/**
 * Validate Solana PublicKey format with enhanced error handling
 */
export function validatePublicKey(key: unknown, fieldName: string): PublicKey {
  if (typeof key !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName);
  }

  const trimmed = key.trim();
  if (!trimmed) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
  }

  try {
    const pubkey = new PublicKey(trimmed);
    
    // Additional validation - ensure it's not the default/system program
    if (pubkey.equals(PublicKey.default)) {
      throw new ValidationError(`${fieldName} cannot be the default PublicKey`, fieldName);
    }

    return pubkey;
  } catch (error) {
    logger.warn('PublicKey validation failed', { 
      fieldName, 
      value: trimmed, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw new ValidationError(
      `Invalid Solana public key format for ${fieldName}`,
      fieldName
    );
  }
}

/**
 * Validate multiple public keys at once with batch processing
 */
export function validatePublicKeys(keys: { [key: string]: unknown }): { [key: string]: PublicKey } {
  const validated: { [key: string]: PublicKey } = {};
  const errors: string[] = [];

  for (const [fieldName, keyString] of Object.entries(keys)) {
    try {
      validated[fieldName] = validatePublicKey(keyString, fieldName);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error.message);
      } else {
        errors.push(`Invalid ${fieldName}: ${error}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(`Multiple validation errors: ${errors.join(', ')}`);
  }

  return validated;
}

// ============================================================================
// COMPANY VALIDATIONS
// ============================================================================

/**
 * Check if company exists and return company data
 * Contract constraint: Company must exist
 */
export async function validateCompanyExists(companyPubkey: PublicKey, context?: ValidationContext) {
  const validationContext = context || {
    operation: 'validateCompanyExists',
    resourceType: 'Company',
    identifier: companyPubkey.toBase58()
  };

  return circuitBreaker.execute(async () => {
    logger.debug('Validating company existence', validationContext);
    
    const startTime = Date.now();
    const company = await sdk.getCompanyByPubkey(companyPubkey);
    const duration = Date.now() - startTime;

    logger.debug('Company validation completed', { 
      ...validationContext, 
      duration, 
      found: !!company 
    });

    if (!company) {
      logger.warn('Company not found', validationContext);
      throw new NotFoundError('Company', companyPubkey.toBase58());
    }

    return company;
  }, validationContext);
}

/**
 * Check if company is active
 * Contract error: CompanyInactive (6004)
 */
export async function validateCompanyActive(companyPubkey: PublicKey, context?: ValidationContext) {
  const company = await validateCompanyExists(companyPubkey, context);
  
  if (!company.isActive) {
    logger.warn('Company is inactive', { 
      company: companyPubkey.toBase58(), 
      ...context 
    });
    throw new ValidationError('Company is not active', 'companyStatus');
  }

  logger.debug('Company active validation passed', { 
    company: companyPubkey.toBase58() 
  });
  
  return company;
}

/**
 * Validate user is company authority
 * Contract error: Unauthorized (6008)
 */
export async function validateCompanyAuthority(
  companyPubkey: PublicKey,
  authorityPubkey: PublicKey,
  context?: ValidationContext
) {
  const company = await validateCompanyExists(companyPubkey, context);
  
  if (company.authority.toBase58() !== authorityPubkey.toBase58()) {
    logger.warn('Authority validation failed', {
      company: companyPubkey.toBase58(),
      expectedAuthority: company.authority.toBase58(),
      providedAuthority: authorityPubkey.toBase58(),
      ...context
    });
    throw new ForbiddenError('Not authorized: You are not the company authority');
  }

  logger.debug('Company authority validation passed', {
    company: companyPubkey.toBase58(),
    authority: authorityPubkey.toBase58()
  });

  return company;
}

// ============================================================================
// EMPLOYEE VALIDATIONS
// ============================================================================

/**
 * Check if employee exists and return employee data
 * Contract constraint: Employee must exist
 */
export async function validateEmployeeExists(employeePubkey: PublicKey, context?: ValidationContext) {
  const validationContext = context || {
    operation: 'validateEmployeeExists',
    resourceType: 'Employee',
    identifier: employeePubkey.toBase58()
  };

  return circuitBreaker.execute(async () => {
    logger.debug('Validating employee existence', validationContext);
    
    const startTime = Date.now();
    const employee = await sdk.getEmployeeByPubkey(employeePubkey);
    const duration = Date.now() - startTime;

    logger.debug('Employee validation completed', { 
      ...validationContext, 
      duration, 
      found: !!employee 
    });

    if (!employee) {
      logger.warn('Employee not found', validationContext);
      throw new NotFoundError('Employee', employeePubkey.toBase58());
    }

    return employee;
  }, validationContext);
}

/**
 * Check if employee is active (status = 1)
 * Contract error: EmployeeNotActive (6005)
 */
export async function validateEmployeeActive(employeePubkey: PublicKey, context?: ValidationContext) {
  const employee = await validateEmployeeExists(employeePubkey, context);
  
  if (employee.status !== EmployeeStatus.Active) {
    logger.warn('Employee is not active', { 
      employee: employeePubkey.toBase58(), 
      status: employee.status,
      ...context 
    });
    throw new ValidationError('Employee is not active', 'employeeStatus');
  }

  logger.debug('Employee active validation passed', { 
    employee: employeePubkey.toBase58() 
  });

  return employee;
}

/**
 * Check if employee is inactive (status = 2) - for close account
 * Contract error: EmployeeStillActive (6014)
 */
export async function validateEmployeeInactive(employeePubkey: PublicKey, context?: ValidationContext) {
  const employee = await validateEmployeeExists(employeePubkey, context);
  
  if (employee.status !== EmployeeStatus.Inactive) {
    logger.warn('Employee is not inactive', { 
      employee: employeePubkey.toBase58(), 
      status: employee.status,
      ...context 
    });
    throw new ValidationError(
      'Employee must be inactive to close account',
      'employeeStatus'
    );
  }

  return employee;
}

/**
 * Validate employee belongs to company
 * Contract constraint: Employee company must match
 */
export async function validateEmployeeBelongsToCompany(
  employeePubkey: PublicKey,
  companyPubkey: PublicKey,
  context?: ValidationContext
) {
  const employee = await validateEmployeeExists(employeePubkey, context);
  
  if (employee.company.toBase58() !== companyPubkey.toBase58()) {
    logger.warn('Employee does not belong to company', {
      employee: employeePubkey.toBase58(),
      employeeCompany: employee.company.toBase58(),
      expectedCompany: companyPubkey.toBase58(),
      ...context
    });
    throw new ValidationError(
      'Employee does not belong to this company',
      'employee'
    );
  }

  return employee;
}

// ============================================================================
// CERTIFICATE VALIDATIONS
// ============================================================================

/**
 * Check if certificate exists and return certificate data
 * Contract constraint: Certificate must exist
 */
export async function validateCertificateExists(certificatePubkey: PublicKey, context?: ValidationContext) {
  const validationContext = context || {
    operation: 'validateCertificateExists',
    resourceType: 'Certificate',
    identifier: certificatePubkey.toBase58()
  };

  return circuitBreaker.execute(async () => {
    logger.debug('Validating certificate existence', validationContext);
    
    const startTime = Date.now();
    const certificate = await sdk.getCertificateByPubkey(certificatePubkey);
    const duration = Date.now() - startTime;

    logger.debug('Certificate validation completed', { 
      ...validationContext, 
      duration, 
      found: !!certificate 
    });

    if (!certificate) {
      logger.warn('Certificate not found', validationContext);
      throw new NotFoundError('Certificate', certificatePubkey.toBase58());
    }

    return certificate;
  }, validationContext);
}

/**
 * Check if certificate is active (status = 0)
 * Contract error: CertificateNotActive (6006)
 */
export async function validateCertificateActive(certificatePubkey: PublicKey, context?: ValidationContext) {
  const certificate = await validateCertificateExists(certificatePubkey, context);
  
  if (certificate.status !== CertificateStatus.Active) {
    logger.warn('Certificate is not active', { 
      certificate: certificatePubkey.toBase58(), 
      status: certificate.status,
      ...context 
    });
    throw new ValidationError('Certificate is not active', 'certificateStatus');
  }

  return certificate;
}

/**
 * Check if certificate can be closed (revoked or expired)
 * Contract error: CertificateNotClosable (6015)
 */
export async function validateCertificateClosable(certificatePubkey: PublicKey, context?: ValidationContext) {
  const certificate = await validateCertificateExists(certificatePubkey, context);
  
  if (
    certificate.status !== CertificateStatus.Revoked &&
    certificate.status !== CertificateStatus.Expired
  ) {
    logger.warn('Certificate is not closable', { 
      certificate: certificatePubkey.toBase58(), 
      status: certificate.status,
      ...context 
    });
    throw new ValidationError(
      'Certificate must be revoked or expired to close',
      'certificateStatus'
    );
  }

  return certificate;
}

// ============================================================================
// COMBINED VALIDATIONS (Common patterns)
// ============================================================================

/**
 * Validate complete certificate issuance prerequisites with enhanced logging
 */
export async function validateCertificateIssuance(
  companyPubkey: PublicKey,
  employeePubkey: PublicKey,
  templatePubkey: PublicKey,
  authorityPubkey: PublicKey,
  context?: Partial<ValidationContext>
) {
  const validationContext: ValidationContext = {
    operation: 'validateCertificateIssuance',
    resourceType: 'Certificate',
    ...context
  };

  logger.info('Starting certificate issuance validation', validationContext);

  try {
    // Company must be active and authority must match
    const company = await validateCompanyActive(companyPubkey, validationContext);
    await validateCompanyAuthority(companyPubkey, authorityPubkey, validationContext);

    // Employee must exist, be active, and belong to company
    await validateEmployeeActive(employeePubkey, validationContext);
    await validateEmployeeBelongsToCompany(employeePubkey, companyPubkey, validationContext);

    // Template must exist and belong to company
    await validateTemplateBelongsToCompany(templatePubkey, companyPubkey, validationContext);

    logger.info('Certificate issuance validation completed successfully', validationContext);

    return { company };
  } catch (error) {
    logger.error('Certificate issuance validation failed', { 
      ...validationContext, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}

/**
 * Validate complete award minting prerequisites with enhanced logging
 */
export async function validateAwardMinting(
  companyPubkey: PublicKey,
  employeePubkey: PublicKey,
  awardTypePubkey: PublicKey,
  authorityPubkey: PublicKey,
  context?: Partial<ValidationContext>
) {
  const validationContext: ValidationContext = {
    operation: 'validateAwardMinting',
    resourceType: 'Award',
    ...context
  };

  logger.info('Starting award minting validation', validationContext);

  try {
    // Company must be active and authority must match
    await validateCompanyActive(companyPubkey, validationContext);
    await validateCompanyAuthority(companyPubkey, authorityPubkey, validationContext);

    // Employee must exist, be active, and belong to company
    await validateEmployeeActive(employeePubkey, validationContext);
    await validateEmployeeBelongsToCompany(employeePubkey, companyPubkey, validationContext);

    // Award type must exist, be active, and belong to company
    await validateAwardTypeActive(awardTypePubkey, validationContext);
    await validateAwardTypeBelongsToCompany(awardTypePubkey, companyPubkey, validationContext);

    logger.info('Award minting validation completed successfully', validationContext);
  } catch (error) {
    logger.error('Award minting validation failed', { 
      ...validationContext, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}

// ============================================================================
// ADDITIONAL VALIDATION FUNCTIONS (Simplified for brevity)
// ============================================================================

export async function validateTemplateExists(templatePubkey: PublicKey, context?: ValidationContext) {
  const template = await sdk.getTemplateByPubkey(templatePubkey);
  if (!template) {
    throw new NotFoundError('CertificateTemplate', templatePubkey.toBase58());
  }
  return template;
}

export async function validateTemplateBelongsToCompany(
  templatePubkey: PublicKey,
  companyPubkey: PublicKey,
  context?: ValidationContext
) {
  const template = await validateTemplateExists(templatePubkey, context);
  if (template.company.toBase58() !== companyPubkey.toBase58()) {
    throw new ValidationError('Template does not belong to this company', 'template');
  }
  return template;
}

export async function validateAwardTypeExists(awardTypePubkey: PublicKey, context?: ValidationContext) {
  const awardType = await sdk.getAwardTypeByPubkey(awardTypePubkey);
  if (!awardType) {
    throw new NotFoundError('AwardType', awardTypePubkey.toBase58());
  }
  return awardType;
}

export async function validateAwardTypeActive(awardTypePubkey: PublicKey, context?: ValidationContext) {
  const awardType = await validateAwardTypeExists(awardTypePubkey, context);
  if (!awardType.isActive) {
    throw new ValidationError('Award type is not active', 'awardTypeStatus');
  }
  return awardType;
}

export async function validateAwardTypeBelongsToCompany(
  awardTypePubkey: PublicKey,
  companyPubkey: PublicKey,
  context?: ValidationContext
) {
  const awardType = await validateAwardTypeExists(awardTypePubkey, context);
  if (awardType.company.toBase58() !== companyPubkey.toBase58()) {
    throw new ValidationError('Award type does not belong to this company', 'awardType');
  }
  return awardType;
}

// ============================================================================
// EXPIRY & TIMESTAMP VALIDATIONS
// ============================================================================

export function validateExpirationTime(expiresAt: unknown): number {
  const timestamp = validateNumber(expiresAt, 'expiresAt', 0);
  const now = Math.floor(Date.now() / 1000);
  
  if (timestamp <= now) {
    throw new ValidationError('Expiration time must be in the future', 'expiresAt');
  }

  return timestamp;
}

// ============================================================================
// PENDING TRANSFER VALIDATIONS
// ============================================================================

export async function validatePendingTransferExists(companyPubkey: PublicKey, context?: ValidationContext) {
  const pendingTransfer = await sdk.getPendingTransfer(companyPubkey);
  if (!pendingTransfer) {
    throw new NotFoundError('PendingTransfer', companyPubkey.toBase58());
  }
  return pendingTransfer;
}

export async function validateNoPendingTransfer(companyPubkey: PublicKey, context?: ValidationContext): Promise<void> {
  const pendingTransfer = await sdk.getPendingTransfer(companyPubkey);
  if (pendingTransfer) {
    throw new ConflictError('A pending authority transfer already exists');
  }
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

export function getValidationMetrics() {
  return {
    circuitBreakerState: {
      failures: (circuitBreaker as any).failures,
      isOpen: (circuitBreaker as any).isOpen()
    }
  };
}
