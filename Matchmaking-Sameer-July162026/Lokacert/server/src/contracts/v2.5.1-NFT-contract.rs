use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
        Metadata,
    },
    token::{self, Mint, MintTo, Token},
};

declare_id!("2orRo1ZjuPGL45jGPNXzyKpscSm1EAwgzsTLAKWKnP76");

#[program]
pub mod lokacert {
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

        company.authority = ctx.accounts.authority.key(); // admin wallet address 
        company.company_id = company_id.clone();
        company.company_details = company_details;
        company.is_active = true;
        company.created_at = clock.unix_timestamp;
        company.updated_at = clock.unix_timestamp;
        company.total_employees = 0;
        company.total_certificates = 0;
        company.total_templates = 0;
        company.total_awards = 0;
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
        email_hash: String,
        employee_details: String,
        confirmation_token: String,
    ) -> Result<()> {
        require!(email_hash.len() <= 64, CertificationError::HashTooLong);
        require!(
            employee_details.len() <= 100,
            CertificationError::CidTooLong
        );
        require!(
            confirmation_token.len() <= 64,
            CertificationError::TokenTooLong
        );

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
        employee.total_awards = 0;
        employee.date_of_joining = 0;
        employee.date_of_leaving = 0;
        employee.bump = ctx.bumps.employee;

        company.total_employees = company
            .total_employees
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
        employee.date_of_joining = clock.unix_timestamp;
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

        if matches!(new_status, EmployeeStatus::Inactive) {
            if employee.date_of_leaving == 0 {
                employee.date_of_leaving = clock.unix_timestamp;
            }
        }

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
        certificate_details: String,
        expires_at: Option<i64>,
    ) -> Result<()> {
        require!(
            certificate_id.len() <= 64,
            CertificationError::CertificateIdTooLong
        );
        require!(
            certificate_details.len() <= 100,
            CertificationError::CidTooLong
        );

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

        company.total_certificates = company
            .total_certificates
            .checked_add(1)
            .ok_or(CertificationError::NumericalOverflow)?;

        employee.total_certificates = employee
            .total_certificates
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

        let is_expired =
            certificate.expires_at > 0 && clock.unix_timestamp > certificate.expires_at;
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

    /// Update employee details ( by company authority only)
    pub fn update_employee(ctx: Context<UpdateEmployee>, employee_details: String) -> Result<()> {
        require!(
            employee_details.len() <= 100,
            CertificationError::CidTooLong
        );

        let employee = &mut ctx.accounts.employee;
        let clock = Clock::get()?;

        employee.employee_details = employee_details;
        employee.updated_at = clock.unix_timestamp;

        emit!(EmployeeDetailsUpdated {
            employee: employee.key(),
            company: employee.company,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Create a certificate template
    pub fn create_certificate_template(
        ctx: Context<CreateCertificateTemplate>,
        template_id: String,
        certificate_details: String,
    ) -> Result<()> {
        require!(
            template_id.len() <= 64,
            CertificationError::TemplateIdTooLong
        );
        require!(
            certificate_details.len() <= 100,
            CertificationError::CidTooLong
        );

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

        company.total_templates = company
            .total_templates
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
        require!(
            certificate_details.len() <= 100,
            CertificationError::CidTooLong
        );

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

    /// Create an award type (e.g., "Employee of the Month", "Best Project Manager")
    pub fn create_award_type(
        ctx: Context<CreateAwardType>,
        award_type_id: String,
        name: String,
        symbol: String,
        metadata_uri: String,
    ) -> Result<()> {
        require!(
            award_type_id.len() <= 64,
            CertificationError::AwardTypeIdTooLong
        );
        require!(name.len() <= 100, CertificationError::NameTooLong);
        require!(symbol.len() <= 10, CertificationError::SymbolTooLong);
        require!(metadata_uri.len() <= 200, CertificationError::UriTooLong);

        let company = &mut ctx.accounts.company;
        let award_type = &mut ctx.accounts.award_type;
        let clock = Clock::get()?;

        require!(company.is_active, CertificationError::CompanyInactive);

        award_type.award_type_id = award_type_id.clone();
        award_type.company = company.key();
        award_type.name = name;
        award_type.symbol = symbol;
        award_type.metadata_uri = metadata_uri;
        award_type.is_active = true;
        award_type.total_issued = 0;
        award_type.created_at = clock.unix_timestamp;
        award_type.updated_at = clock.unix_timestamp;
        award_type.bump = ctx.bumps.award_type;

        emit!(AwardTypeCreated {
            award_type: award_type.key(),
            company: company.key(),
            award_type_id,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Mint an NFT award to an employee
    pub fn mint_award_nft(
        ctx: Context<MintAwardNFT>,
        award_id: String,
    ) -> Result<()> {
        require!(award_id.len() <= 64, CertificationError::AwardIdTooLong);

        let company = &mut ctx.accounts.company;
        let employee = &mut ctx.accounts.employee;
        let award_type = &ctx.accounts.award_type;
        let award = &mut ctx.accounts.award;
        let clock = Clock::get()?;

        require!(company.is_active, CertificationError::CompanyInactive);
        require!(award_type.is_active, CertificationError::AwardTypeInactive);
        require!(
            matches!(employee.status, EmployeeStatus::Active),
            CertificationError::EmployeeNotActive
        );

        // Initialize award account
        award.award_id = award_id.clone();
        award.company = company.key();
        award.employee = employee.key();
        award.award_type = award_type.key();
        award.mint = ctx.accounts.mint.key();
        award.created_at = clock.unix_timestamp;
        award.bump = ctx.bumps.award;

        // Create associated token account if it doesn't exist
        let mint_key = ctx.accounts.mint.key();
        let ata_seeds = &[
            ctx.accounts.employee_wallet.key.as_ref(),
            ctx.accounts.token_program.key.as_ref(),
            mint_key.as_ref(),
        ];
        let (expected_ata, _) =
            Pubkey::find_program_address(ata_seeds, &ctx.accounts.associated_token_program.key());

        require!(
            ctx.accounts.recipient_token_account.key() == expected_ata,
            CertificationError::InvalidTokenAccount
        );

        // If the account doesn't exist, create it
        if ctx.accounts.recipient_token_account.data_is_empty() {
            anchor_spl::associated_token::create(CpiContext::new(
                ctx.accounts.associated_token_program.to_account_info(),
                anchor_spl::associated_token::Create {
                    payer: ctx.accounts.company_authority.to_account_info(),
                    associated_token: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: ctx.accounts.employee_wallet.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                },
            ))?;
        }

        // Mint NFT (1 token)
        let company_id = &company.company_id;
        let seeds = &[b"company", company_id.as_bytes(), &[company.bump]];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: company.to_account_info(),
                },
                signer,
            ),
            1,
        )?;

        // ← CHANGED: Use award_type data for metadata
        let name = format!("{} #{}", award_type.name, award_id);
        let symbol = award_type.symbol.clone();
        let uri = award_type.metadata_uri.clone();

        // Create metadata
        let data_v2 = DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.metadata.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    mint_authority: company.to_account_info(),
                    update_authority: company.to_account_info(),
                    payer: ctx.accounts.company_authority.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer,
            ),
            data_v2,
            true,
            true,
            None,
        )?;

        // Update counters
        company.total_awards = company
            .total_awards
            .checked_add(1)
            .ok_or(CertificationError::NumericalOverflow)?;

        employee.total_awards = employee
            .total_awards
            .checked_add(1)
            .ok_or(CertificationError::NumericalOverflow)?;

        emit!(AwardMinted {
            award: award.key(),
            company: company.key(),
            employee: employee.key(),
            award_type: award_type.key(),
            mint: ctx.accounts.mint.key(),
            award_id,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
    /// Update award type status
    pub fn update_award_type(
        ctx: Context<UpdateAwardType>,
        name: Option<String>,
        description: Option<String>,
        metadata_uri: Option<String>,
        is_active: Option<bool>,
    ) -> Result<()> {
        let award_type = &mut ctx.accounts.award_type;
        let clock = Clock::get()?;

        if let Some(new_name) = name {
            require!(new_name.len() <= 100, CertificationError::NameTooLong);
            award_type.name = new_name;
        }

        if let Some(new_description) = description {
            require!(
                new_description.len() <= 150,
                CertificationError::DescriptionTooLong
            );
            award_type.description = new_description;
        }

        if let Some(new_uri) = metadata_uri {
            require!(new_uri.len() <= 200, CertificationError::UriTooLong);
            award_type.metadata_uri = new_uri;
        }

        if let Some(active) = is_active {
            award_type.is_active = active;
        }

        award_type.updated_at = clock.unix_timestamp;

        emit!(AwardTypeUpdated {
            award_type: award_type.key(),
            company: award_type.company,
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
    pub authority: Pubkey,       // 32
    pub company_id: String,      // 4 + 32 = 36
    pub company_details: String, // 4 + 100 = 104
    pub is_active: bool,         // 1
    pub created_at: i64,         // 8
    pub updated_at: i64,         // 8
    pub total_employees: u64,    // 8
    pub total_certificates: u64, // 8
    pub total_templates: u64,    // 8
    pub total_awards: u64,       // 8
    pub bump: u8,                // 1
}

impl Company {
    pub const LEN: usize = 8 + 32 + 36 + 104 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct Employee {
    pub wallet: Pubkey,             // 32
    pub company: Pubkey,            // 32
    pub email_hash: String,         // 4 + 64 = 68
    pub employee_details: String,   // 4 + 100 = 104
    pub status: EmployeeStatus,     // 1
    pub created_at: i64,            // 8
    pub updated_at: i64,            // 8
    pub confirmation_token: String, // 4 + 64 = 68
    pub total_certificates: u64,    // 8
    pub total_awards: u64,          // 8
    pub date_of_joining: i64,       // 8  - NEW FIELD
    pub date_of_leaving: i64,       // 8 - NEW FIELD (optional)
    pub bump: u8,                   // 1
}

impl Employee {
    pub const LEN: usize = 8 + 32 + 32 + 68 + 104 + 1 + 8 + 8 + 68 + 8 + 8 + 8 + 8 + 1; // Updated to 364
}

#[account]
pub struct Certificate {
    pub certificate_id: String,      // 4 + 64 = 68
    pub company: Pubkey,             // 32
    pub employee: Pubkey,            // 32
    pub template: String,            // 4 + 64 = 68
    pub certificate_details: String, // 4 + 100 = 104
    pub status: CertificateStatus,   // 1
    pub created_at: i64,             // 8
    pub expires_at: i64,             // 8
    pub bump: u8,                    // 1
}

impl Certificate {
    pub const LEN: usize = 8 + 68 + 32 + 32 + 68 + 104 + 1 + 8 + 8 + 1;
}

#[account]
pub struct CertificateTemplate {
    pub template_id: String,         // 4 + 64 = 68
    pub company: Pubkey,             // 32
    pub certificate_details: String, // 4 + 100 = 104
    pub created_at: i64,             // 8
    pub updated_at: i64,             // 8
    pub bump: u8,                    // 1
}

impl CertificateTemplate {
    pub const LEN: usize = 8 + 68 + 32 + 104 + 8 + 8 + 1;
}

#[account]
pub struct AwardType {
    pub award_type_id: String, // 4 + 64 = 68
    pub company: Pubkey,       // 32
    pub name: String,          // 4 + 100 = 104
    pub symbol: String,        // 4 + 10 = 14
    pub metadata_uri: String,  // 4 + 200 = 204
    pub is_active: bool,       // 1
    pub total_issued: u64,     // 8
    pub created_at: i64,       // 8
    pub updated_at: i64,       // 8
    pub bump: u8,              // 1
}

impl AwardType {
    pub const LEN: usize = 8 + 68 + 32 + 104 + 14 + 204 + 1 + 8 + 8 + 8 + 1; // 456 bytes
}

#[account]
pub struct Award {
    pub award_id: String,   // 4 + 64 = 68
    pub company: Pubkey,    // 32
    pub employee: Pubkey,   // 32
    pub award_type: Pubkey, // 32
    pub mint: Pubkey,       // 32
    pub created_at: i64,    // 8
    pub bump: u8,           // 1
}

impl Award {
    pub const LEN: usize = 8 + 68 + 32 + 32 + 32 + 32 + 8 + 1;
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

    /// CHECK: Employee wallet address
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

// #[derive(Accounts)]
// pub struct UpdateEmployee<'info> {
//     #[account(
//         mut,
//         seeds = [b"employee", employee.company.as_ref(), employee_wallet.key().as_ref()],
//         bump = employee.bump,
//         constraint = employee.wallet == employee_wallet.key() @ CertificationError::Unauthorized
//     )]
//     pub employee: Account<'info, Employee>,

//     pub company_authority : Signer<'info>
// }

#[derive(Accounts)]
pub struct UpdateEmployee<'info> {
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

#[derive(Accounts)]
#[instruction(award_type_id: String)]
pub struct CreateAwardType<'info> {
    #[account(
        mut,
        constraint = company.authority == company_authority.key() @ CertificationError::Unauthorized
    )]
    pub company: Account<'info, Company>,

    #[account(
        init,
        payer = company_authority,
        space = AwardType::LEN,
        seeds = [b"award_type", company.key().as_ref(), award_type_id.as_bytes()],
        bump
    )]
    pub award_type: Account<'info, AwardType>,

    #[account(mut)]
    pub company_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateAwardType<'info> {
    #[account(
        constraint = company.authority == company_authority.key() @ CertificationError::Unauthorized
    )]
    pub company: Account<'info, Company>,

    #[account(
        mut,
        constraint = award_type.company == company.key() @ CertificationError::InvalidCompany
    )]
    pub award_type: Account<'info, AwardType>,

    pub company_authority: Signer<'info>,
}
#[derive(Accounts)]
#[instruction(award_id: String)]
pub struct MintAwardNFT<'info> {
    #[account(
        mut,
        seeds = [b"company", company.company_id.as_bytes()],
        bump = company.bump,
        constraint = company.authority == company_authority.key() @ CertificationError::Unauthorized
    )]
    pub company: Account<'info, Company>,

    #[account(
        mut,
        constraint = employee.company == company.key() @ CertificationError::InvalidCompany,
        constraint = employee.wallet == employee_wallet.key() @ CertificationError::InvalidEmployee
    )]
    pub employee: Account<'info, Employee>,

    #[account(
        constraint = award_type.company == company.key() @ CertificationError::InvalidCompany
    )]
    pub award_type: Account<'info, AwardType>,

    #[account(
        init,
        payer = company_authority,
        space = Award::LEN,
        seeds = [b"award", company.key().as_ref(), award_id.as_bytes()],
        bump
    )]
    pub award: Account<'info, Award>,

    #[account(
        init,
        payer = company_authority,
        mint::decimals = 0,
        mint::authority = company,
        mint::freeze_authority = company,
        seeds = [b"award_mint", company.key().as_ref(), award_id.as_bytes()],
        bump
    )]
    pub mint: Account<'info, Mint>,

    /// CHECK: This is the employee's wallet that will receive the NFT
    pub employee_wallet: AccountInfo<'info>,

    /// CHECK: This account is validated in the instruction logic by deriving the expected ATA address
    #[account(mut)]
    pub recipient_token_account: UncheckedAccount<'info>,

    /// CHECK: Metadata account will be checked by the Metaplex program
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    #[account(mut)]
    pub company_authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
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
pub struct EmployeeDetailsUpdated {
    pub employee: Pubkey,
    pub company: Pubkey,
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

#[event]
pub struct AwardTypeCreated {
    pub award_type: Pubkey,
    pub company: Pubkey,
    pub award_type_id: String,
    pub timestamp: i64,
}

#[event]
pub struct AwardTypeUpdated {
    pub award_type: Pubkey,
    pub company: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AwardMinted {
    pub award: Pubkey,
    pub company: Pubkey,
    pub employee: Pubkey,
    pub award_type: Pubkey,
    pub mint: Pubkey,
    pub award_id: String,
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

    #[msg("Award type ID too long (max 64 characters)")]
    AwardTypeIdTooLong,

    #[msg("Award ID too long (max 64 characters)")]
    AwardIdTooLong,

    #[msg("Name too long (max 100 characters)")]
    NameTooLong,

    #[msg("Description too long (max 150 characters)")]
    DescriptionTooLong,

    #[msg("URI too long (max 200 characters)")]
    UriTooLong,

    #[msg("Symbol too long (max 10 characters)")]
    SymbolTooLong,

    #[msg("Award type is not active")]
    AwardTypeInactive,

    #[msg("Invalid token account")]
    InvalidTokenAccount,

    #[msg("Invalid award type")]
    SymbolTooLong,

    #[msg("Award type is not active")]
    AwardTypeInactive,

    #[msg("Invalid token account")]
    InvalidTokenAccount,
}
