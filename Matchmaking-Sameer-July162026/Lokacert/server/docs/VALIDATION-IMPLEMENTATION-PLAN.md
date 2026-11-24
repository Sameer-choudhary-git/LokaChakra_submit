# Implementation Plan: Comprehensive Validation & Checks

## Overview

Currently, the server has:
- ✅ **Blockchain validation** ([blockchainValidation.ts](file:///c:/Users/samee/Desktop/Finn/Coding/Onchain-Intern-Certificate-development/workflow%20branch/server/src/utils/blockchainValidation.ts)) - 800+ lines with 15+ validators
- ⚠️ **Basic field checks** - Controllers check if fields exist (`if (!field)`) but lack comprehensive validation
- ❌ **Placeholder validation** ([validation.ts](file:///c:/Users/samee/Desktop/Finn/Coding/Onchain-Intern-Certificate-development/workflow%20branch/server/src/utils/validation.ts)) - Empty, commented out code

This plan adds a comprehensive **input validation layer** for all HTTP endpoints.

## Proposed Changes

### 1. Core Validation Utilities

#### [MODIFY] [validation.ts](file:///c:/Users/samee/Desktop/Finn/Coding/Onchain-Intern-Certificate-development/workflow%20branch/server/src/utils/validation.ts)

Replace placeholder validation with comprehensive input validators:

**New Functions:**
- `validateEmail(email: string): string` - Email format validation with regex
- `validateUrl(url: string): string` - URL format validation
- `validateString(value: unknown, fieldName: string, minLength?: number, maxLength?: number): string`
- `validateNumber(value: unknown, fieldName: string, min?: number, max?: number): number`
- `validateBoolean(value: unknown, fieldName: string): boolean`
- `validateEnum\<T\>(value: unknown, enumObj: any, fieldName: string): T`
- `validateArray(value: unknown, fieldName: string, minLength?: number): any[]`
- `validateObject(value: unknown, fieldName: string): object`
- `validateRequiredFields(data: any, requiredFields: string[]): void`
- `validateOptionalFields(data: any, allowedFields: string[]): void`

---

### 2. Request Validation Middleware

#### [NEW] [src/middleware/validateRequest.ts](file:///c:/Users/samee/Desktop/Finn/Coding/Onchain-Intern-Certificate-development/workflow%20branch/server/src/middleware/validateRequest.ts)

Create validation middleware for each controller:

**Middleware Functions:**
- `validateCreateCompany` - Validate company creation request
- `validateUpdateCompany` - Validate company update request
- `validateAddEmployee` - Validate employee addition request
- `validateConfirmEmployee` - Validate employee confirmation request
- `validateUpdateEmployee` - Validate employee update request
- `validateIssueCertificate` - Validate certificate issuance request
- `validateRevokeCertificate` - Validate certificate revocation request
- `validateCreateAwardType` - Validate award type creation request
- `validateMintAward` - Validate award minting request
- `validateCreateTemplate` - Validate certificate template creation request

Each middleware will:
1. Check required fields are present
2. Validate field types and formats
3. Check field length constraints (using blockchain validation constants)
4. Throw appropriate `ValidationError` with field name

---

### 3. Enhanced Input Validation in Controllers

#### [MODIFY] [company.controller.ts](file:///c:/Users/samee/Desktop/Finn/Coding/Onchain-Intern-Certificate-development/workflow%20branch/server/src/controllers/company.controller.ts)

**Changes:**
- Add `validateEmail()` for company email in `companyDetails`
- Add `validateRequiredFields()` for all required fields
- Add type validation for `isActive` boolean in `updateCompany`
- Add check for extra/unexpected fields to prevent injection

**Example Before:**
```typescript
if (!companyId || !companyDetails || !employeerDetails || !authorityPubkey) {
  throw new ValidationError('Missing required fields');
}
```

**Example After:**
```typescript
validateRequiredFields(req.body, ['companyId', 'companyDetails', 'employeerDetails', 'authorityPubkey']);
if (companyDetails.email) {
  companyDetails.email = validateEmail(companyDetails.email);
}
validateString(companyDetails.name, 'company name', 1, 100);
```

---

#### [MODIFY] [employee.controller.ts](file:///c:/Users/samee/Desktop/Finn/Coding/Onchain-Intern-Certificate-development/workflow%20branch/server/src/controllers/employee.controller.ts)

**Changes:**
- Add `validateEmail()` for employee email in `employeeDetails`
- Add enum validation for `newStatus` in `updateEmployeeStatus` (must be 0, 1, or 2)
- Add validation that prevents setting status to invalid values
- Add check for required `employeeWallet` format

**Example:**
```typescript
// Validate status enum
const validatedStatus = validateEnum\<EmployeeStatus\>(
  newStatus, 
  EmployeeStatus, 
  'newStatus'
);
```

---

#### [MODIFY] [certificate.controller.ts](file:///c:/Users/samee/Desktop/Finn/Coding/Onchain-Intern-Certificate-development/workflow%20branch/server/src/controllers/certificate.controller.ts)

**Changes:**
- Add validation for `expiresAt` timestamp (must be future timestamp)
- Add validation for `certificateDetails` object structure
- Add check that `certificateDetails` is valid JSON
- Add validation for `certificateId` and `templateId` format

---

#### [MODIFY] [award.controller.ts](file:///c:/Users/samee/Desktop/Finn/Coding/Onchain-Intern-Certificate-development/workflow%20branch/server/src/controllers/award.controller.ts)

**Changes:**
- Add validation for `symbol` format (alphanumeric only, max 10 chars)
- Add validation for `name` length (already using `validateNameLength`)
- Add boolean validation for `isActive` in `updateAwardType`
- Add validation for `awardTypeDetails` object structure

---

#### [MODIFY] [cetrificateTemplate.controller.ts](file:///c:/Users/samee/Desktop/Finn/Coding/Onchain-Intern-Certificate-development/workflow%20branch/server/src/controllers/cetrificateTemplate.controller.ts)

**Changes:**
- Add validation for template metadata structure
- Add validation for template URI format
- Add check for required template fields

---

#### [MODIFY] [notification.controller.ts](file:///c:/Users/samee/Desktop/Finn/Coding/Onchain-Intern-Certificate-development/workflow%20branch/server/src/controllers/notification.controller.ts)

**Changes:**
- Add validation for notification type enum
- Add validation for notification message length
- Add validation for recipient email format

---

#### [MODIFY] [closeAccount.controller.ts](file:///c:/Users/samee/Desktop/Finn/Coding/Onchain-Intern-Certificate-development/workflow%20branch/server/src/controllers/closeAccount.controller.ts)

**Changes:**
- Add validation that account is in closable state
- Add validation for required signatures
- Add validation for beneficiary address

---

### 4. Security & Rate Limiting Checks

#### [MODIFY] [requestLogger.ts](file:///c:/Users/samee/Desktop/Finn/Coding/Onchain-Intern-Certificate-development/workflow%20branch/server/src/middleware/requestLogger.ts)

**Changes (already implemented):**
- ✅ Rate limiting monitoring (500 requests/15min per IP)
- ✅ Suspicious pattern detection (XSS, SQLi, path traversal)
- ✅ User agent validation

**Additional Enhancements:**
- Add configurable rate limits per endpoint (stricter limits for write operations)
- Add IP whitelisting for admin endpoints (if needed)

---

### 5. Request Sanitization

#### [NEW] [src/middleware/sanitizeInput.ts](file:///c:/Users/samee/Desktop/Finn/Coding/Onchain-Intern-Certificate-development/workflow%20branch/server/src/middleware/sanitizeInput.ts)

Create middleware to sanitize all input:

**Features:**
- Trim whitespace from all string inputs
- Remove null bytes
- Strip HTML/script tags from text fields  
- Validate JSON payloads don't exceed size limits
- Log suspicious input patterns

---

### 6. Response Validation

#### [NEW] [src/middleware/validateResponse.ts](file:///c:/Users/samee/Desktop/Finn/Coding/Onchain-Intern-Certificate-development/workflow%20branch/server/src/middleware/validateResponse.ts)

Create middleware to ensure consistent responses:

**Features:**
- Ensure all success responses have `{ success: true, data, message, requestId }` format
- Ensure all error responses follow `ErrorResponse` format
- Add response size validation (warn if response \u003e 10MB)
- Remove sensitive fields from responses

---

### 7. Route Integration

#### [MODIFY] [route.index.ts](file:///c:/Users/samee/Desktop/Finn/Coding/Onchain-Intern-Certificate-development/workflow%20branch/server/src/routes/route.index.ts)

Add validation middleware to each route:

**Example:**
```typescript
// Before
router.post('/company/create', createCompany);

// After
router.post('/company/create', validateCreateCompany, createCompany);
```

**All Routes to Update:**
- `/company/create` → `validateCreateCompany`
- `/company/update` → `validateUpdateCompany`
- `/employee/add` → `validateAddEmployee`
- `/employee/confirm` → `validateConfirmEmployee`
- `/certificate/issue` → `validateIssueCertificate`
- `/certificate/revoke` → `validateRevokeCertificate`
- `/award/create` → `validateCreateAwardType`
- `/award/mint` → `validateMintAward`
- (and all other POST endpoints)

---

### 8. Enhanced Error Messages

#### [MODIFY] [CustomErrors.ts](file:///c:/Users/samee/Desktop/Finn/Coding/Onchain-Intern-Certificate-development/workflow%20branch/server/src/utils/errors/CustomErrors.ts)

**Changes:**
- Add `ValidationErrors` (plural) class for multiple validation errors
- Enhance `ValidationError` to include:
  - `field` - which field failed
  - `value` - the invalid value (redacted if sensitive)
  - `expected` - what was expected
  - `constraint` - which constraint failed (e.g., "too long", "invalid format")

---

## Verification Plan

### Manual Testing with Postman/curl

Since no test files exist in the project, verification will be done through manual testing with comprehensive test cases.

#### 1. Test Invalid Inputs (ValidationError Expected)

**Test Missing Required Fields:**
```bash
# Missing companyId
curl -X POST http://localhost:8080/api/company/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "companyDetails": {},
    "employeerDetails": {},
    "authorityPubkey": "valid_pubkey"
  }'

# Expected: 400 { "error": { "code": "VALIDATION_ERROR", "message": "companyId is required" } }
```

**Test Invalid Field Types:**
```bash
# isActive should be boolean
curl -X POST http://localhost:8080/api/company/update \\
  -H "Content-Type: application/json" \\
  -d '{
    "companyPubkey": "valid_pubkey",
    "authorityPubkey": "valid_pubkey",
    "isActive": "yes"
  }'

# Expected: 400 { "error": { "code": "VALIDATION_ERROR", "field": "isActive", "message": "isActive must be a boolean" } }
```

**Test Field Length Violations:**
```bash
# Name too long (\u003e 32 chars)
curl -X POST http://localhost:8080/api/award/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "companyPubkey": "valid_pubkey",
    "awardTypeId": "abc123",
    "name": "This is a very long name that exceeds thirty two characters",
    "symbol": "AWARD",
    "companyAuthorityPubkey": "valid_pubkey",
    "awardTypeDetails": {}
  }'

# Expected: 400 { "error": { "code": "VALIDATION_ERROR", "message": "name is too long (max 32 characters)" } }
```

**Test Invalid Email:**
```bash
# Invalid email format
curl -X POST http://localhost:8080/api/company/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "companyId": "comp01",
    "companyDetails": { "email": "invalid-email" },
    "employeerDetails": {},
    "authorityPubkey": "valid_pubkey"
  }'

# Expected: 400 { "error": { "code": "VALIDATION_ERROR", "field": "email", "message": "Invalid email format" } }
```

**Test Invalid Enum Values:**
```bash
# Invalid employee status (must be 0, 1, or 2)
curl -X POST http://localhost:8080/api/employee/status \\
  -H "Content-Type: application/json" \\
  -d '{
    "employeePubkey": "valid_pubkey",
    "companyPubkey": "valid_pubkey",
    "authorityPubkey": "valid_pubkey",
    "newStatus": 99
  }'

# Expected: 400 { "error": { "code": "VALIDATION_ERROR", "field": "newStatus", "message": "newStatus must be one of: 0, 1, 2" } }
```

**Test Invalid PublicKey Format:**
```bash
# Invalid Solana public key
curl -X POST http://localhost:8080/api/company/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "companyId": "comp01",
    "companyDetails": {},
    "employeerDetails": {},
    "authorityPubkey": "invalid_key"
  }'

# Expected: 400 { "error": { "code": "VALIDATION_ERROR", "field": "authorityPubkey", "message": "Invalid Solana public key format" } }
```

**Test XSS/Injection Attempts:**
```bash
# HTML/script injection in name field
curl -X POST http://localhost:8080/api/award/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "companyPubkey": "valid_pubkey",
    "awardTypeId": "abc123",
    "name": "\u003cscript\u003ealert(\"xss\")\u003c/script\u003e",
    "symbol": "AWARD",
    "companyAuthorityPubkey": "valid_pubkey",
    "awardTypeDetails": {}
  }'

# Expected: 400 OR sanitized input logged in console
# Check logs: should see warning about sanitization
```

#### 2. Test Valid Inputs (Success Expected)

**Test Valid Company Creation:**
```bash
# All fields valid
curl -X POST http://localhost:8080/api/company/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "companyId": "comp01",
    "companyDetails": { 
      "name": "Acme Corp",
      "email": "admin@acme.com"
    },
    "employeerDetails": {
      "name": "John Doe",
      "email": "john@acme.com"
    },
    "authorityPubkey": "\u003cVALID_PUBKEY\u003e"
  }'

# Expected: 200 { "success": true, "data": { "transaction": "...", "companyPDA": "..." } }
```

**Test Valid Employee Status Update:**
```bash
# Valid status enum
curl -X POST http://localhost:8080/api/employee/status \\
  -H "Content-Type: application/json" \\
  -d '{
    "employeePubkey": "\u003cVALID_PUBKEY\u003e",
    "companyPubkey": "\u003cVALID_PUBKEY\u003e",
    "authorityPubkey": "\u003cVALID_PUBKEY\u003e",
    "newStatus": 1
  }'

# Expected: 200 { "success": true, "data": { "transaction": "..." } }
```

#### 3. Verify Logs

After each test, check logs in Kibana (http://localhost:5601) or server console:

**Check for validation errors:**
```
Filter: message: "Validation error" OR level: "warn"
```

**Check for security alerts:**
```
Filter: message: "Security Alert" OR "suspicious"
```

**Check for sanitization warnings:**
```
Filter: message: "Input sanitization detected"
```

#### 4. Test Rate Limiting

```bash
# Run this script to send 100 requests rapidly
for i in {1..100}; do
  curl -X GET http://localhost:8080/api/company/all &
done
wait

# Check logs for rate limit warnings
# Expected: After ~50 requests, should see warnings in logs
```

#### 5. Test Edge Cases

**Test empty strings:**
```bash
curl -X POST http://localhost:8080/api/company/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "companyId": "",
    "companyDetails": {},
    "employeerDetails": {},
    "authorityPubkey": "valid_pubkey"
  }'

# Expected: 400 ValidationError: "companyId cannot be empty"
```

**Test null values:**
```bash
curl -X POST http://localhost:8080/api/company/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "companyId": null,
    "companyDetails": {},
    "employeerDetails": {},
    "authorityPubkey": "valid_pubkey"
  }'

# Expected: 400 ValidationError: "companyId must be a string"
```

**Test undefined vs missing:**
```bash
curl -X POST http://localhost:8080/api/company/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "companyId": "comp01",
    "companyDetails": {},
    "employeerDetails": {},
    "authorityPubkey": undefined
  }'

# Expected: 400 ValidationError: "authorityPubkey is required"
```

---

## Summary

This plan adds **5 new files** and modifies **10 existing files** to create a comprehensive validation layer:

### New Files
1. `src/middleware/validateRequest.ts` - Request validation middleware
2. `src/middleware/sanitizeInput.ts` - Input sanitization
3. `src/middleware/validateResponse.ts` - Response validation

### Modified Files
1. `utils/validation.ts` - Core validation utilities
2. `controllers/company.controller.ts` - Enhanced validation
3. `controllers/employee.controller.ts` - Enhanced validation
4. `controllers/certificate.controller.ts` - Enhanced validation
5. `controllers/award.controller.ts` - Enhanced validation
6. `controllers/cetrificateTemplate.controller.ts` - Enhanced validation
7. `controllers/notification.controller.ts` - Enhanced validation
8. `controllers/closeAccount.controller.ts` - Enhanced validation
9. `routes/route.index.ts` - Add middleware to routes
10. `utils/errors/CustomErrors.ts` - Enhanced error types

### Validation Coverage
- ✅ Required field validation
- ✅ Type validation (string, number, boolean, object, array)
- ✅ Format validation (email, URL, PublicKey)
- ✅ Length validation (min/max for strings and arrays)
- ✅ Range validation (min/max for numbers)
- ✅ Enum validation (status, types)
- ✅ Input sanitization (XSS, injection prevention)
- ✅ Rate limiting (already implemented)
- ✅ Security pattern detection (already implemented)

All validation errors will return proper `400 Bad Request` with detailed error messages including field names and constraints.
