use anchor_lang::prelude::*;

declare_id!("EY7qdW6E2z8FVRTXnXpzUK2upqFH1Xz7LEYhNYU8y699");

#[program]
pub mod onchain_certification {
    use super::*;

    /// Initialize a new company
    pub fn initialize_company(
        ctx: Context<InitializeCompany>,
        company_id: String,
        company_details: String, // CID for CompanyDetails
    ) -> Result<()> {
        require!(company_id.len() <= 32, CertificationError::CompanyIdTooLong);
        require!(company_details.len() <= 100, CertificationError::CidTooLong);

        let company = &mut ctx.accounts.company;
        let clock = Clock::get()?;


        company.authority = ctx.accounts.authority.key();
        company.company_id = company_id.clone();
        company.company_details = company_details;
        company.is_active = true;
        company.created_at = clock.unix_timestamp;
        company.updated_at = clock.unix_timestamp;
        company.total_employees = 0;
        company.total_certificates = 0;
        company.total_templates = 0;
        company.bump = ctx.bumps.company;

        emit!(CompanyInitialized {
            company: company.key(),
            authority: company.authority,
            company_id,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Add an employee to a company (Pending state)
    pub fn add_employee(
        ctx: Context<AddEmployee>,
        email_hash: String, // sha256 hash as hex string
        employee_details: String, // CID for EmployeeDetails
        confirmation_token: String,
    ) -> Result<()> {
        require!(email_hash.len() <= 64, CertificationError::HashTooLong);
        require!(employee_details.len() <= 100, CertificationError::CidTooLong);
        require!(confirmation_token.len() <= 64, CertificationError::TokenTooLong);

        let company = &mut ctx.accounts.company;
        let employee = &mut ctx.accounts.employee;
        let clock = Clock::get()?;

        require!(company.is_active, CertificationError::CompanyInactive);

        employee.wallet = ctx.accounts.employee_wallet.key();
        employee.company = company.key();
        employee.email_hash = email_hash;
        employee.employee_details = employee_details;
        employee.status = EmployeeStatus::Pending;
        employee.created_at = clock.unix_timestamp;
        employee.updated_at = clock.unix_timestamp;
        employee.confirmation_token = confirmation_token;
        employee.total_certificates = 0;
        employee.bump = ctx.bumps.employee;

        company.total_employees = company.total_employees
            .checked_add(1)
            .ok_or(CertificationError::NumericalOverflow)?;

        emit!(EmployeeAdded {
            company: company.key(),
            employee: employee.key(),
            employee_wallet: employee.wallet,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Employee confirms their account
    pub fn confirm_employee(
        ctx: Context<ConfirmEmployee>,
        confirmation_token: String,
    ) -> Result<()> {
        let employee = &mut ctx.accounts.employee;
        let clock = Clock::get()?;

        require!(
            matches!(employee.status, EmployeeStatus::Pending),
            CertificationError::EmployeeAlreadyConfirmed
        );

        require!(
            employee.confirmation_token == confirmation_token,
            CertificationError::InvalidConfirmationToken
        );

        employee.status = EmployeeStatus::Active;
        employee.updated_at = clock.unix_timestamp;

        emit!(EmployeeConfirmed {
            employee: employee.key(),
            company: employee.company,
            employee_wallet: employee.wallet,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Update employee status (company authority only)
    pub fn update_employee_status(
        ctx: Context<UpdateEmployeeStatus>,
        new_status: EmployeeStatus,
    ) -> Result<()> {
        let employee = &mut ctx.accounts.employee;
        let clock = Clock::get()?;

        require!(
            !matches!(new_status, EmployeeStatus::Pending),
            CertificationError::CannotRevertToPending
        );

        require!(
            !matches!(employee.status, EmployeeStatus::Pending),
            CertificationError::EmployeeNotConfirmed
        );

        let old_status = employee.status;
        employee.status = new_status;
        employee.updated_at = clock.unix_timestamp;

        emit!(EmployeeStatusUpdated {
            employee: employee.key(),
            company: employee.company,
            old_status,
            new_status,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Issue a certificate to an employee
    pub fn issue_certificate(
        ctx: Context<IssueCertificate>,
        certificate_id: String,
        template_id: String,
        certificate_details: String, // CID for certificate data
        expires_at: Option<i64>,
    ) -> Result<()> {
        require!(
            certificate_id.len() <= 64,
            CertificationError::CertificateIdTooLong
        );
        require!(certificate_details.len() <= 100, CertificationError::CidTooLong);

        let company = &mut ctx.accounts.company;
        let employee = &mut ctx.accounts.employee;
        let certificate = &mut ctx.accounts.certificate;
        let clock = Clock::get()?;

        require!(company.is_active, CertificationError::CompanyInactive);
        require!(
            matches!(employee.status, EmployeeStatus::Active),
            CertificationError::EmployeeNotActive
        );

        certificate.certificate_id = certificate_id.clone();
        certificate.company = company.key();
        certificate.employee = employee.key();
        certificate.template = template_id;
        certificate.certificate_details = certificate_details;
        certificate.status = CertificateStatus::Active;
        certificate.created_at = clock.unix_timestamp;
        certificate.expires_at = expires_at.unwrap_or(0);
        certificate.bump = ctx.bumps.certificate;

        // Update counters
        company.total_certificates = company.total_certificates
            .checked_add(1)
            .ok_or(CertificationError::NumericalOverflow)?;

        employee.total_certificates = employee.total_certificates
            .checked_add(1)
            .ok_or(CertificationError::NumericalOverflow)?;

        emit!(CertificateIssued {
            certificate: certificate.key(),
            company: company.key(),
            employee: employee.key(),
            certificate_id,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Revoke a certificate
    pub fn revoke_certificate(ctx: Context<RevokeCertificate>) -> Result<()> {
        let certificate = &mut ctx.accounts.certificate;

        require!(
            matches!(certificate.status, CertificateStatus::Active),
            CertificationError::CertificateNotActive
        );

        certificate.status = CertificateStatus::Revoked;

        emit!(CertificateRevoked {
            certificate: certificate.key(),
            company: certificate.company,
            employee: certificate.employee,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Verify certificate validity (read-only)
    pub fn verify_certificate(ctx: Context<VerifyCertificate>) -> Result<()> {
        let certificate = &ctx.accounts.certificate;
        let company = &ctx.accounts.company;
        let employee = &ctx.accounts.employee;
        let clock = Clock::get()?;

        let is_expired = certificate.expires_at > 0 && clock.unix_timestamp > certificate.expires_at;
        let is_valid = matches!(certificate.status, CertificateStatus::Active)
            && company.is_active 
            && matches!(employee.status, EmployeeStatus::Active)
            && !is_expired;

        msg!("=== Certificate Verification ===");
        msg!("Certificate ID: {}", certificate.certificate_id);
        msg!("Company: {}", company.company_id);
        msg!("Employee Wallet: {}", employee.wallet);
        msg!("Issued At: {}", certificate.created_at);
        msg!("Expires At: {}", certificate.expires_at);
        msg!("Status: {:?}", certificate.status);
        msg!("Employee Status: {:?}", employee.status);
        msg!("Company Active: {}", company.is_active);
        msg!("Is Expired: {}", is_expired);
        msg!("Is Valid: {}", is_valid);

        Ok(())
    }

    /// Update company information
    pub fn update_company(
        ctx: Context<UpdateCompany>,
        company_details: Option<String>,
        is_active: Option<bool>,
    ) -> Result<()> {
        let company = &mut ctx.accounts.company;
        let clock = Clock::get()?;

        if let Some(new_details) = company_details {
            require!(new_details.len() <= 100, CertificationError::CidTooLong);
            company.company_details = new_details;
        }

        if let Some(active) = is_active {
            company.is_active = active;
        }

        company.updated_at = clock.unix_timestamp;

        Ok(())
    }

    /// Update employee details
    pub fn update_employee(
        ctx: Context<UpdateEmployee>,
        employee_details: String,
    ) -> Result<()> {
        require!(employee_details.len() <= 100, CertificationError::CidTooLong);
        
        let employee = &mut ctx.accounts.employee;
        let clock = Clock::get()?;

        employee.employee_details = employee_details;
        employee.updated_at = clock.unix_timestamp;

        Ok(())
    }

    /// Create a certificate template
    pub fn create_certificate_template(
        ctx: Context<CreateCertificateTemplate>,
        template_id: String,
        certificate_details: String, // CID for template metadata
    ) -> Result<()> {
        require!(template_id.len() <= 64, CertificationError::TemplateIdTooLong);
        require!(certificate_details.len() <= 100, CertificationError::CidTooLong);

        let company = &mut ctx.accounts.company;
        let template = &mut ctx.accounts.certificate_template;
        let clock = Clock::get()?;

        require!(company.is_active, CertificationError::CompanyInactive);

        template.template_id = template_id.clone();
        template.company = company.key();
        template.certificate_details = certificate_details;
        template.created_at = clock.unix_timestamp;
        template.updated_at = clock.unix_timestamp;
        template.bump = ctx.bumps.certificate_template;

        company.total_templates = company.total_templates
            .checked_add(1)
            .ok_or(CertificationError::NumericalOverflow)?;

        emit!(CertificateTemplateCreated {
            template: template.key(),
            company: company.key(),
            template_id,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Update certificate template
    pub fn update_certificate_template(
        ctx: Context<UpdateCertificateTemplate>,
        certificate_details: String,
    ) -> Result<()> {
        require!(certificate_details.len() <= 100, CertificationError::CidTooLong);

        let template = &mut ctx.accounts.certificate_template;
        let clock = Clock::get()?;

        template.certificate_details = certificate_details;
        template.updated_at = clock.unix_timestamp;

        emit!(CertificateTemplateUpdated {
            template: template.key(),
            company: template.company,
            template_id: template.template_id.clone(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

// ============================================================================
// ACCOUNT STRUCTURES
// ============================================================================

#[account]
pub struct Company {
    pub authority: Pubkey,           // 32 bytes
    pub company_id: String,          // 4 + 32 = 36 bytes
    pub company_details: String,     // 4 + 100 = 104 bytes (CID)
    pub is_active: bool,             // 1 byte
    pub created_at: i64,             // 8 bytes
    pub updated_at: i64,             // 8 bytes
    pub total_employees: u64,        // 8 bytes
    pub total_certificates: u64,     // 8 bytes
    pub total_templates: u64,        // 8 bytes
    pub bump: u8,                    // 1 byte
}

impl Company {
    pub const LEN: usize = 8 + 32 + 36 + 104 + 1 + 8 + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct Employee {
    pub wallet: Pubkey,              // 32 bytes
    pub company: Pubkey,             // 32 bytes
    pub email_hash: String,          // 4 + 64 = 68 bytes (sha256 hex)
    pub employee_details: String,    // 4 + 100 = 104 bytes (CID)
    pub status: EmployeeStatus,      // 1 byte
    pub created_at: i64,             // 8 bytes
    pub updated_at: i64,             // 8 bytes
    pub confirmation_token: String,  // 4 + 64 = 68 bytes
    pub total_certificates: u64,     // 8 bytes
    pub bump: u8,                    // 1 byte
}

impl Employee {
    pub const LEN: usize = 8 + 32 + 32 + 68 + 104 + 1 + 8 + 8 + 68 + 8 + 1;
}

#[account]
pub struct Certificate {
    pub certificate_id: String,      // 4 + 64 = 68 bytes
    pub company: Pubkey,             // 32 bytes
    pub employee: Pubkey,            // 32 bytes
    pub template: String,            // 4 + 64 = 68 bytes (template_id)
    pub certificate_details: String, // 4 + 100 = 104 bytes (CID)
    pub status: CertificateStatus,   // 1 byte
    pub created_at: i64,             // 8 bytes
    pub expires_at: i64,             // 8 bytes (0 = no expiration)
    pub bump: u8,                    // 1 byte
}

impl Certificate {
    pub const LEN: usize = 8 + 68 + 32 + 32 + 68 + 104 + 1 + 8 + 8 + 1;
}

#[account]
pub struct CertificateTemplate {
    pub template_id: String,         // 4 + 64 = 68 bytes
    pub company: Pubkey,             // 32 bytes
    pub certificate_details: String, // 4 + 100 = 104 bytes (CID)
    pub created_at: i64,             // 8 bytes
    pub updated_at: i64,             // 8 bytes
    pub bump: u8,                    // 1 byte
}

impl CertificateTemplate {
    pub const LEN: usize = 8 + 68 + 32 + 104 + 8 + 8 + 1;
}

// ============================================================================
// ENUMS
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum EmployeeStatus {
    Pending,
    Active,
    Inactive,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum CertificateStatus {
    Active,
    Revoked,
    Expired,
}

// ============================================================================
// CONTEXT STRUCTS
// ============================================================================

#[derive(Accounts)]
#[instruction(company_id: String)]
pub struct InitializeCompany<'info> {
    #[account(
        init,
        payer = authority,
        space = Company::LEN,
        seeds = [b"company", company_id.as_bytes()],
        bump
    )]
    pub company: Account<'info, Company>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddEmployee<'info> {
    #[account(
        mut,
        constraint = company.authority == company_authority.key() @ CertificationError::Unauthorized
    )]
    pub company: Account<'info, Company>,

    #[account(
        init,
        payer = company_authority,
        space = Employee::LEN,
        seeds = [b"employee", company.key().as_ref(), employee_wallet.key().as_ref()],
        bump
    )]
    pub employee: Account<'info, Employee>,

    /// CHECK: Employee wallet address, validated by PDA seeds
    pub employee_wallet: AccountInfo<'info>,

    #[account(mut)]
    pub company_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ConfirmEmployee<'info> {
    #[account(
        mut,
        seeds = [b"employee", employee.company.as_ref(), employee_wallet.key().as_ref()],
        bump = employee.bump,
        constraint = employee.wallet == employee_wallet.key() @ CertificationError::Unauthorized
    )]
    pub employee: Account<'info, Employee>,

    pub employee_wallet: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateEmployeeStatus<'info> {
    #[account(
        constraint = company.authority == company_authority.key() @ CertificationError::Unauthorized
    )]
    pub company: Account<'info, Company>,

    #[account(
        mut,
        constraint = employee.company == company.key() @ CertificationError::InvalidCompany
    )]
    pub employee: Account<'info, Employee>,

    pub company_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateEmployee<'info> {
    #[account(
        mut,
        seeds = [b"employee", employee.company.as_ref(), employee_wallet.key().as_ref()],
        bump = employee.bump,
        constraint = employee.wallet == employee_wallet.key() @ CertificationError::Unauthorized
    )]
    pub employee: Account<'info, Employee>,

    pub employee_wallet: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(certificate_id: String)]
pub struct IssueCertificate<'info> {
    #[account(
        mut,
        constraint = company.authority == company_authority.key() @ CertificationError::Unauthorized
    )]
    pub company: Account<'info, Company>,

    #[account(
        mut,
        constraint = employee.company == company.key() @ CertificationError::InvalidCompany
    )]
    pub employee: Account<'info, Employee>,

    #[account(
        init,
        payer = company_authority,
        space = Certificate::LEN,
        seeds = [b"certificate", company.key().as_ref(), certificate_id.as_bytes()],
        bump
    )]
    pub certificate: Account<'info, Certificate>,

    #[account(mut)]
    pub company_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeCertificate<'info> {
    #[account(
        constraint = company.authority == company_authority.key() @ CertificationError::Unauthorized
    )]
    pub company: Account<'info, Company>,

    #[account(
        mut,
        constraint = certificate.company == company.key() @ CertificationError::InvalidCompany
    )]
    pub certificate: Account<'info, Certificate>,

    pub company_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct VerifyCertificate<'info> {
    pub certificate: Account<'info, Certificate>,

    #[account(
        constraint = company.key() == certificate.company @ CertificationError::InvalidCompany
    )]
    pub company: Account<'info, Company>,

    #[account(
        constraint = employee.key() == certificate.employee @ CertificationError::InvalidEmployee
    )]
    pub employee: Account<'info, Employee>,
}

#[derive(Accounts)]
pub struct UpdateCompany<'info> {
    #[account(
        mut,
        constraint = company.authority == authority.key() @ CertificationError::Unauthorized
    )]
    pub company: Account<'info, Company>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(template_id: String)]
pub struct CreateCertificateTemplate<'info> {
    #[account(
        mut,
        constraint = company.authority == company_authority.key() @ CertificationError::Unauthorized
    )]
    pub company: Account<'info, Company>,

    #[account(
        init,
        payer = company_authority,
        space = CertificateTemplate::LEN,
        seeds = [b"template", company.key().as_ref(), template_id.as_bytes()],
        bump
    )]
    pub certificate_template: Account<'info, CertificateTemplate>,

    #[account(mut)]
    pub company_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateCertificateTemplate<'info> {
    #[account(
        constraint = company.authority == company_authority.key() @ CertificationError::Unauthorized
    )]
    pub company: Account<'info, Company>,

    #[account(
        mut,
        constraint = certificate_template.company == company.key() @ CertificationError::InvalidCompany
    )]
    pub certificate_template: Account<'info, CertificateTemplate>,

    pub company_authority: Signer<'info>,
}

// ============================================================================
// EVENTS
// ============================================================================

#[event]
pub struct CompanyInitialized {
    pub company: Pubkey,
    pub authority: Pubkey,
    pub company_id: String,
    pub timestamp: i64,
}

#[event]
pub struct EmployeeAdded {
    pub company: Pubkey,
    pub employee: Pubkey,
    pub employee_wallet: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct EmployeeConfirmed {
    pub employee: Pubkey,
    pub company: Pubkey,
    pub employee_wallet: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct EmployeeStatusUpdated {
    pub employee: Pubkey,
    pub company: Pubkey,
    pub old_status: EmployeeStatus,
    pub new_status: EmployeeStatus,
    pub timestamp: i64,
}

#[event]
pub struct CertificateIssued {
    pub certificate: Pubkey,
    pub company: Pubkey,
    pub employee: Pubkey,
    pub certificate_id: String,
    pub timestamp: i64,
}

#[event]
pub struct CertificateRevoked {
    pub certificate: Pubkey,
    pub company: Pubkey,
    pub employee: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CertificateTemplateCreated {
    pub template: Pubkey,
    pub company: Pubkey,
    pub template_id: String,
    pub timestamp: i64,
}

#[event]
pub struct CertificateTemplateUpdated {
    pub template: Pubkey,
    pub company: Pubkey,
    pub template_id: String,
    pub timestamp: i64,
}

// ============================================================================
// ERROR CODES
// ============================================================================

#[error_code]
pub enum CertificationError {
    #[msg("Company ID too long (max 32 characters)")]
    CompanyIdTooLong,

    #[msg("CID too long (max 100 characters)")]
    CidTooLong,

    #[msg("Hash too long (max 64 characters)")]
    HashTooLong,

    #[msg("Token too long (max 64 characters)")]
    TokenTooLong,

    #[msg("Certificate ID too long (max 64 characters)")]
    CertificateIdTooLong,

    #[msg("Company is not active")]
    CompanyInactive,

    #[msg("Employee already confirmed")]
    EmployeeAlreadyConfirmed,

    #[msg("Invalid confirmation token")]
    InvalidConfirmationToken,

    #[msg("Cannot revert to pending status")]
    CannotRevertToPending,

    #[msg("Employee not confirmed yet")]
    EmployeeNotConfirmed,

    #[msg("Employee is not active")]
    EmployeeNotActive,

    #[msg("Certificate is not active")]
    CertificateNotActive,

    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("Invalid company")]
    InvalidCompany,

    #[msg("Invalid employee")]
    InvalidEmployee,

    #[msg("Numerical overflow")]
    NumericalOverflow,

    #[msg("Template ID too long (max 64 characters)")]
    TemplateIdTooLong,
}