import express from 'express';
import * as certificateController from '../controllers/certificate.controller';
import * as certificateTemplateController from '../controllers/cetrificateTemplate.controller';
import * as companyController from '../controllers/company.controller';
import * as employeeController from '../controllers/employee.controller';
import * as awardController from '../controllers/award.controller';
import * as closeAccountController from '../controllers/closeAccount.controller';
// import * as notificationController from '../controllers/notification.controller';

const router = express.Router();

// ============================================================================
// COMPANY ROUTES
// ============================================================================

// POST Operations (Transaction Building)
router.post('/company/create', companyController.createCompany);
router.post('/company/update', companyController.updateCompany);
router.post('/company/authority/propose', companyController.proposeTransferAuthority);
router.post('/company/authority/accept', companyController.acceptTransferAuthority);
router.post('/company/authority/cancel', companyController.cancelTransferAuthority);

// GET Operations (Data Retrieval)
router.get('/company/pubkey/:pubkey', companyController.getCompanyByPubkey);
router.get('/company/employees', companyController.getAllEmployees);
router.get('/company/authority/pending/:companyPubkey', companyController.getPendingTransfer);
router.get('/company/:companyId', companyController.getCompanyById);

// ============================================================================
// EMPLOYEE ROUTES
// ============================================================================

// POST Operations (Transaction Building)
router.post('/employee/add', employeeController.addEmployee);
router.post('/employee/confirm', employeeController.confirmEmployee);
router.post('/employee/update', employeeController.updateEmployee);
router.post('/employee/status', employeeController.updateEmployeeStatus);

// GET Operations (Data Retrieval)
router.get('/employee/pubkey/:pubkey', employeeController.getEmployeeByPubkey);
router.get('/employee/certificates', employeeController.getEmployeeCertificates);
router.get('/employee/awards', employeeController.getEmployeeAwards);
router.get('/employee/wallet/:walletAddress', employeeController.getEmployeeRequests);

// ============================================================================
// CERTIFICATE ROUTES
// ============================================================================

// POST Operations (Transaction Building)
router.post('/certificate/issue', certificateController.issueCertificate);
router.post('/certificate/revoke', certificateController.revokeCertificate);

// GET Operations (Data Retrieval)
router.get('/certificate/pubkey/:pubkey', certificateController.getCertificateByPubkey);
router.get('/certificate/verify/:pubkey', certificateController.verifyCertificate);
router.get('/certificate/company', certificateController.getCompanyCertificates);
router.get('/certificate/:certificateId', certificateController.getCertificateById);

// ============================================================================
// CERTIFICATE TEMPLATE ROUTES
// ============================================================================

// POST Operations (Transaction Building)b
router.post('/template/create', certificateTemplateController.createTemplate);
router.post('/template/update', certificateTemplateController.updateCertificateTemplate);

// GET Operations (Data Retrieval)
router.get('/template/:templatePubkey', certificateTemplateController.getTemplate);
router.get('/template/company/:companyPubkey', certificateTemplateController.getCompanyTemplates);
router.get('/template/stats/:companyPubkey', certificateTemplateController.getTemplateStats);

// ============================================================================
// AWARD ROUTES
// ============================================================================

// POST Operations (Transaction Building)
router.post('/award/type/create', awardController.createAwardType);
router.post('/award/type/update', awardController.updateAwardType);
router.post('/award/mint', awardController.mintAwardNFT);

// GET Operations (Data Retrieval)
router.get('/award/types/:companyPubkey', awardController.getCompanyAwardTypes);
router.get('/award/type/:awardTypePubkey', awardController.getAwardType);
router.get('/award/:awardPubkey', awardController.getAward);
router.get('/award/company/:companyPubkey', awardController.getCompanyAwards);
router.get('/award/type/awards/:awardTypePubkey', awardController.getAwardsByType);

// ============================================================================
// CLOSE ACCOUNT ROUTES (Rent Reclamation)
// ============================================================================

// POST Operations (Transaction Building)
router.post('/close/employee', closeAccountController.closeEmployee);
router.post('/close/certificate', closeAccountController.closeCertificate);

// ============================================================================
// NOTIFICATION ROUTES (Post-Transaction Email Triggers)
// ============================================================================
// router.post('/notify/employee-added', notificationController.notifyEmployeeAdded);
// router.post('/notify/certificate-issued', notificationController.notifyCertificateIssued);
// router.post('/notify/award-minted', notificationController.notifyAwardMinted);
// router.post('/notify/employee-updated', notificationController.notifyEmployeeUpdated);
// router.post('/notify/company-created', notificationController.notifyCompanyCreated);
// router.get('/notify/status/:jobId', notificationController.getNotificationStatus);
// router.get('/notify/stats', notificationController.getNotificationStats);

// ============================================================================
// EVENT TESTING ROUTES (Debug event system)
// ============================================================================

export default router;
