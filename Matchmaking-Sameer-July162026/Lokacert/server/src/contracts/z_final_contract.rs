use anchor_lang::prelude::*;
use anchor_lang::event; 
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
        Metadata,
    },
    token::{self, Mint, MintTo, Token},
};

declare_id!("78g8P6uz4Y9aZ899YfZUNzk5q7WLvxcbUBSQ8Eucgh2X");

#[program]
pub mod lokacert {
    use super::*;

    /// Initialize a new company
    pub fn initialize_company(
        ctx: Context<InitializeCompany>,
        company_id: [u8; 6],
        company_details: String,
    ) -> Result<()> {
        require!(company_details.len() <= 43, CertificationError::CidTooLong);

        let company = &mut ctx.accounts.company;
        let clock = Clock::get()?;

        company.authority = ctx.accounts.authority.key();
        company.company_id = company_id;
        company.company_details = company_details;
        company.is_active = true;
        company.created_at = clock.unix_timestamp;
        company.total_employees = 0;
        company.total_certificates = 0;
        company.total_templates = 0;
        company.total_awards = 0;
        company.total_revoked = 0;
        company.version = 1; // Initialize version
        company.bump = ctx.bumps.company;

        emit!(CompanyInitialized {
            company: company.key(),
            authority: company.authority,
            company_id,
            timestamp: clock.unix_timestamp,
            version: company.version,
        });

        Ok(())
    }

    /// Step 1: Create a side-account that says "I want to give this to User X"
    pub fn propose_transfer_authority(
        ctx: Context<ProposeTransferAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        let pending = &mut ctx.accounts.pending_transfer;
        
        pending.company = ctx.accounts.company.key();
        pending.new_authority = new_authority;
        pending.bump = ctx.bumps.pending_transfer;

        emit!(CompanyAuthorityTransferProposed {
            company: ctx.accounts.company.key(),
            current_authority: ctx.accounts.company.authority,
            pending_authority: new_authority,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Step 2: User X signs to accept. The side-account is deleted.
    pub fn accept_transfer_authority(ctx: Context<AcceptTransferAuthority>) -> Result<()> {
        let company = &mut ctx.accounts.company;
        let old_authority = company.authority;
        let new_authority = ctx.accounts.new_authority.key();
        let clock = Clock::get()?;

        // Update the main company account
        company.authority = new_authority;

        emit!(CompanyAuthorityTransferred {
            company: company.key(),
            old_authority,
            new_authority,
            timestamp: clock.unix_timestamp,
        });
        
        // Note: 'pending_transfer' is automatically closed and rent refunded 
        // because of the `close = new_authority` macro in the Context.

        Ok(())
    }

    /// Cancel a pending transfer proposal (only Current Authority can do this)
    pub fn cancel_transfer_authority(ctx: Context<CancelTransferAuthority>) -> Result<()> {
        // No logic needed. The `close = current_authority` macro handles the deletion 
        // and refunds the rent money back to you.

        emit!(CompanyAuthorityTransferCancelled {
            company: ctx.accounts.company.key(),
            authority: ctx.accounts.current_authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }
    

    /// Add an employee to a company
    pub fn add_employee(ctx: Context<AddEmployee>, employee_details: String) -> Result<()> {
        require!(employee_details.len() <= 43, CertificationError::CidTooLong);

        let company = &mut ctx.accounts.company;
        let employee = &mut ctx.accounts.employee;

        require!(company.is_active, CertificationError::CompanyInactive);

        employee.wallet = ctx.accounts.employee_wallet.key();
        employee.company = company.key();
        employee.employee_details = employee_details;
        employee.status = EmployeeStatus::Pending;
        employee.total_certificates = 0;
        employee.total_awards = 0;
        employee.version = 1; // Initialize version
        employee.bump = ctx.bumps.employee;

        company.total_employees = company
            .total_employees
            .checked_add(1)
            .ok_or(CertificationError::NumericalOverflow)?;

        emit!(EmployeeAdded {
            company: company.key(),
            employee: employee.key(),
            employee_wallet: employee.wallet,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn confirm_employee(ctx: Context<ConfirmEmployee>) -> Result<()> {
        let employee = &mut ctx.accounts.employee;

        require!(
            matches!(employee.status, EmployeeStatus::Pending),
            CertificationError::InvalidEmployeeState
        );

        employee.status = EmployeeStatus::Active;

        emit!(EmployeeConfirmed {
            employee: employee.key(),
            company: employee.company,
            employee_wallet: employee.wallet,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Update employee status (company authority only)
    pub fn update_employee_status(
        ctx: Context<UpdateEmployeeStatus>,
        new_status: EmployeeStatus,
    ) -> Result<()> {
        let company = &ctx.accounts.company;
        if matches!(new_status, EmployeeStatus::Active) {
            require!(company.is_active, CertificationError::CompanyInactive);
        }   

        let employee = &mut ctx.accounts.employee;
        let old_status = employee.status;
        employee.status = new_status;



        emit!(EmployeeStatusUpdated {
            employee: employee.key(),
            company: employee.company,
            old_status,
            new_status,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Issue a certificate to an employee
    pub fn issue_certificate(
        ctx: Context<IssueCertificate>,
        certificate_id: [u8; 6],
        template_id: [u8; 6],
        certificate_details: String,
        expires_at: Option<i64>,
    ) -> Result<()> {
        require!(
            certificate_details.len() <= 43,
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

        certificate.certificate_id = certificate_id;
        certificate.company = company.key();
        certificate.employee = employee.key();
        certificate.template = template_id;
        certificate.certificate_details = certificate_details;
        certificate.status = CertificateStatus::Active;
        certificate.created_at = clock.unix_timestamp;
        certificate.expires_at = expires_at.unwrap_or(0);
        certificate.version = 1; // Initialize version
        certificate.bump = ctx.bumps.certificate;

        company.total_certificates = company
            .total_certificates
            .checked_add(1)
            .ok_or(CertificationError::NumericalOverflow)?;

        employee.total_certificates = employee
            .total_certificates
            .checked_add(1)
            .ok_or(CertificationError::NumericalOverflow)?;

        // Inside issue_certificate
        let template = &mut ctx.accounts.certificate_template;

        template.total_issued = template
            .total_issued
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
        let company = &mut ctx.accounts.company;
        let now = Clock::get()?.unix_timestamp;

        enforce_certificate_expiry(certificate, now)?;

        require!(
            matches!(certificate.status, CertificateStatus::Active),
            CertificationError::CertificateNotActive
        );

        certificate.status = CertificateStatus::Revoked;
        company.total_revoked = company
            .total_revoked
            .checked_add(1)
            .ok_or(CertificationError::NumericalOverflow)?;

        emit!(CertificateRevoked {
            certificate: certificate.key(),
            company: certificate.company,
            employee: certificate.employee,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Update company information
    pub fn update_company(
        ctx: Context<UpdateCompany>,
        company_details: Option<String>,
        is_active: Option<bool>,
    ) -> Result<()> {
        let company = &mut ctx.accounts.company;

        if let Some(new_details) = company_details {
            require!(new_details.len() <= 43, CertificationError::CidTooLong);
            company.company_details = new_details;
        }

        if let Some(active) = is_active {
            company.is_active = active;
        }

        emit!(CompanyUpdated {
            company: company.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Update employee details (by company authority only)
    pub fn update_employee(ctx: Context<UpdateEmployee>, employee_details: String) -> Result<()> {
        require!(employee_details.len() <= 43, CertificationError::CidTooLong);

        let employee = &mut ctx.accounts.employee;
        employee.employee_details = employee_details;

        emit!(EmployeeDetailsUpdated {
            employee: employee.key(),
            company: employee.company,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Create a certificate template
    pub fn create_certificate_template(
        ctx: Context<CreateCertificateTemplate>,
        template_id: [u8; 6],
        certificate_details: String,
    ) -> Result<()> {
        require!(
            certificate_details.len() <= 43,
            CertificationError::CidTooLong
        );

        let company = &mut ctx.accounts.company;
        let template = &mut ctx.accounts.certificate_template;

        require!(company.is_active, CertificationError::CompanyInactive);

        template.template_id = template_id;
        template.company = company.key();
        template.certificate_details = certificate_details;
        template.total_issued = 0;
        template.version = 1; // Initialize version
        template.bump = ctx.bumps.certificate_template;

        company.total_templates = company
            .total_templates
            .checked_add(1)
            .ok_or(CertificationError::NumericalOverflow)?;

        emit!(CertificateTemplateCreated {
            template: template.key(),
            company: company.key(),
            template_id,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Update certificate template
    pub fn update_certificate_template(
        ctx: Context<UpdateCertificateTemplate>,
        certificate_details: String,
    ) -> Result<()> {
        require!(
            certificate_details.len() <= 43,
            CertificationError::CidTooLong
        );

        let template = &mut ctx.accounts.certificate_template;
        template.certificate_details = certificate_details;

        emit!(CertificateTemplateUpdated {
            template: template.key(),
            company: template.company,
            template_id: template.template_id,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Create an award type
    pub fn create_award_type(
        ctx: Context<CreateAwardType>,
        award_type_id: [u8; 6],
        metadata_uri: String,
    ) -> Result<()> {
        require!(metadata_uri.len() <= 43, CertificationError::UriTooLong);

        let company = &ctx.accounts.company;
        let award_type = &mut ctx.accounts.award_type;
        let clock = Clock::get()?;

        require!(company.is_active, CertificationError::CompanyInactive);

        award_type.award_type_id = award_type_id;
        award_type.company = company.key();
        award_type.metadata_uri = metadata_uri;
        award_type.is_active = true;
        award_type.total_issued = 0;
        award_type.created_at = clock.unix_timestamp;
        award_type.updated_at = clock.unix_timestamp;
        award_type.version = 1; // Initialize version
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
        award_id: [u8; 6],
        name: String,
        symbol: String,
    ) -> Result<()> {
        require!(name.len() <= 32, CertificationError::NameTooLong);
        require!(symbol.len() <= 10, CertificationError::SymbolTooLong);

        let company = &mut ctx.accounts.company;
        let employee = &mut ctx.accounts.employee;
        let award_type = &mut ctx.accounts.award_type;
        let award = &mut ctx.accounts.award;
        let clock = Clock::get()?;

        require!(company.is_active, CertificationError::CompanyInactive);
        require!(award_type.is_active, CertificationError::AwardTypeInactive);
        require!(
            matches!(employee.status, EmployeeStatus::Active),
            CertificationError::EmployeeNotActive
        );

        // Initialize award account
        award.award_id = award_id;
        award.company = company.key();
        award.employee = employee.key();
        award.award_type = award_type.key();
        award.mint = ctx.accounts.mint.key();
        award.created_at = clock.unix_timestamp;
        award.version = 1; // Initialize version
        award.bump = ctx.bumps.award;

        // Validate ATA
        let mint_key = ctx.accounts.mint.key();
        let ata_seeds = &[
            ctx.accounts.employee_wallet.key.as_ref(),
           &anchor_spl::token::ID.to_bytes(),
            mint_key.as_ref(),
        ];
        let (expected_ata, _) =
            Pubkey::find_program_address(ata_seeds, &ctx.accounts.associated_token_program.key());

        require!(
            ctx.accounts.recipient_token_account.key() == expected_ata,
            CertificationError::InvalidTokenAccount
        );

        // Create ATA if needed
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

        // Mint NFT
        let company_id_bytes = company.company_id.as_ref();
        let seeds = &[b"company", company_id_bytes, &[company.bump]];
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

        // Create metadata
        let data_v2 = DataV2 {
            name,
            symbol,
            uri: award_type.metadata_uri.clone(),
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

        // ====================================================================
        // START FIX: FREEZE ACCOUNT (SOULBOUND LOGIC)
        // ====================================================================
        // Since 'company' is the Freeze Authority (set in the context struct),
        // we can sign for the freeze instruction using the company PDA seeds.
        token::freeze_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::FreezeAccount {
                account: ctx.accounts.recipient_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: company.to_account_info(),
            },
            signer,
        ))?;
        // ====================================================================
        // END FIX
        // ====================================================================

        // Update counters
        company.total_awards = company
            .total_awards
            .checked_add(1)
            .ok_or(CertificationError::NumericalOverflow)?;

        employee.total_awards = employee
            .total_awards
            .checked_add(1)
            .ok_or(CertificationError::NumericalOverflow)?;

        award_type.total_issued = award_type
            .total_issued
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

    /// Update award type
    pub fn update_award_type(
        ctx: Context<UpdateAwardType>,
        metadata_uri: Option<String>,
        is_active: Option<bool>,
    ) -> Result<()> {
        let award_type = &mut ctx.accounts.award_type;
        let clock = Clock::get()?;

        if let Some(new_uri) = metadata_uri {
            require!(new_uri.len() <= 43, CertificationError::UriTooLong);
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

    

    pub fn close_employee(ctx: Context<CloseEmployee>) -> Result<()> {
        let employee = &ctx.accounts.employee;

        require!(
            matches!(employee.status, EmployeeStatus::Inactive),
            CertificationError::EmployeeStillActive
        );
        emit!(EmployeeClosed {
            company: ctx.accounts.company.key(),
            employee: employee.key(),
            authority: ctx.accounts.company_authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn close_certificate(ctx: Context<CloseCertificate>) -> Result<()> {
        let certificate = &mut ctx.accounts.certificate;
        let now = Clock::get()?.unix_timestamp;
    
        enforce_certificate_expiry(certificate, now)?;

        require!(
            matches!(
                certificate.status,
                CertificateStatus::Revoked | CertificateStatus::Expired
            ),
            CertificationError::CertificateNotClosable
        );

        emit!(CertificateClosed {
            company: ctx.accounts.company.key(),
            certificate: certificate.key(),
            authority: ctx.accounts.company_authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

fn enforce_certificate_expiry(certificate: &mut Account<Certificate>, now: i64) -> Result<()> {
        if certificate.status == CertificateStatus::Active
            && certificate.expires_at != 0
            && now > certificate.expires_at
        {
            certificate.status = CertificateStatus::Expired;
        }
        Ok(())
}


// ============================================================================
// ACCOUNT STRUCTURES
// ============================================================================

#[account]
pub struct Company {
    pub authority: Pubkey,       // 32
    pub company_id: [u8; 6],     // 6
    pub company_details: String, // 4 + 43 = 47
    pub is_active: bool,         // 1
    pub created_at: i64,         // 8
    pub total_employees: u16,    // 2
    pub total_certificates: u32, // 4
    pub total_templates: u8,     // 1
    pub total_awards: u16,       // 2
    pub total_revoked: u32,      // 4
    pub version: u8,             // 1
    pub bump: u8,                // 1
}

impl Company {
    pub const LEN: usize = 8 + 32 + 6 + 47 + 1 + 8 + 2 + 4 + 1 + 2 + 4 + 1 + 1;
}

#[account]
pub struct PendingTransfer {
    pub company: Pubkey,        // 32
    pub new_authority: Pubkey,  // 32
    pub bump: u8,               // 1
}

impl PendingTransfer {
    pub const LEN: usize = 8 + 32 + 32 + 1;
}

#[account]
pub struct Employee {
    pub wallet: Pubkey,           // 32
    pub company: Pubkey,          // 32
    pub employee_details: String, // 4 + 43 = 47
    pub status: EmployeeStatus,   // 1
    pub total_certificates: u8,   // 1
    pub total_awards: u8,         // 1
    pub version: u8,              // 1
    pub bump: u8,                 // 1
}

impl Employee {
    pub const LEN: usize = 8 + 32 + 32 + 47 + 1 + 1 + 1 + 1 + 1;
}

#[account]
pub struct Certificate {
    pub certificate_id: [u8; 6],     // 6
    pub company: Pubkey,             // 32
    pub employee: Pubkey,            // 32
    pub template: [u8; 6],           // 6
    pub certificate_details: String, // 4 + 43 = 47
    pub status: CertificateStatus,   // 1
    pub created_at: i64,             // 8
    pub expires_at: i64,             // 8
    pub version: u8,                 // 1
    pub bump: u8,                    // 1
}

impl Certificate {
    pub const LEN: usize = 8 + 6 + 32 + 32 + 6 + 47 + 1 + 8 + 8 + 1 + 1;
}

#[account]
pub struct CertificateTemplate {
    pub template_id: [u8; 6],        // 6
    pub company: Pubkey,             // 32
    pub certificate_details: String, // 4 + 43 = 47
    pub total_issued: u16,           // 2
    pub version: u8,                 // 1
    pub bump: u8,                    // 1
}

impl CertificateTemplate {
    pub const LEN: usize = 8 + 6 + 32 + 47 + 2 + 1 + 1;
}

#[account]
pub struct AwardType {
    pub award_type_id: [u8; 6], // 6
    pub company: Pubkey,        // 32
    pub metadata_uri: String,   // 4 + 43 = 47
    pub is_active: bool,        // 1
    pub total_issued: u64,      // 8
    pub created_at: i64,        // 8
    pub updated_at: i64,        // 8
    pub version: u8,            // 1
    pub bump: u8,               // 1
}

impl AwardType {
    pub const LEN: usize = 8 + 6 + 32 + 47 + 1 + 8 + 8 + 8 + 1 + 1;
}

#[account]
pub struct Award {
    pub award_id: [u8; 6],  // 6
    pub company: Pubkey,    // 32
    pub employee: Pubkey,   // 32
    pub award_type: Pubkey, // 32
    pub mint: Pubkey,       // 32
    pub created_at: i64,    // 8
    pub version: u8,        // 1
    pub bump: u8,           // 1
}

impl Award {
    pub const LEN: usize = 8 + 6 + 32 + 32 + 32 + 32 + 8 + 1 + 1;
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
#[instruction(company_id: [u8; 6])]
pub struct InitializeCompany<'info> {
    #[account(
        init,
        payer = authority,
        space = Company::LEN,
        seeds = [b"company", company_id.as_ref()],
        bump
    )]
    pub company: Account<'info, Company>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProposeTransferAuthority<'info> {
    #[account(
        mut,
        constraint = company.authority == current_authority.key() @ CertificationError::Unauthorized
    )]
    pub company: Account<'info, Company>,

    #[account(
        init,
        payer = current_authority,
        space = PendingTransfer::LEN,
        // Seeded by the company, so there can only be 1 active proposal at a time per company
        seeds = [b"transfer_request", company.key().as_ref()],
        bump
    )]
    pub pending_transfer: Account<'info, PendingTransfer>,

    #[account(mut)]
    pub current_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptTransferAuthority<'info> {
    #[account(mut)]
    pub company: Account<'info, Company>,

    // We verify this account exists and matches the company
    #[account(
        mut,
        seeds = [b"transfer_request", company.key().as_ref()],
        bump = pending_transfer.bump,
        // CRITICAL: Ensure the signer is the one named in the proposal
        constraint = pending_transfer.new_authority == new_authority.key() @ CertificationError::Unauthorized,
        // Close the account after success to refund rent to the new authority
        close = old_authority 
    )]
    pub pending_transfer: Account<'info, PendingTransfer>,

    pub new_authority: Signer<'info>,
    // NEW: We must pass the old authority account so we can send money to it
    /// CHECK: We only use this as a destination for the rent refund
    #[account(
        mut, 
        // Verify this account is actually the current company authority
        address = company.authority @ CertificationError::Unauthorized
    )]
    pub old_authority: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CancelTransferAuthority<'info> {
    #[account(
        mut,
        constraint = company.authority == current_authority.key() @ CertificationError::Unauthorized
    )]
    pub company: Account<'info, Company>,

    #[account(
        mut,
        seeds = [b"transfer_request", company.key().as_ref()],
        bump = pending_transfer.bump,
        close = current_authority // Refund rent back to the Old Authority
    )]
    pub pending_transfer: Account<'info, PendingTransfer>,

    pub current_authority: Signer<'info>,
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
        constraint = employee.wallet == employee_wallet.key()
            @ CertificationError::Unauthorized
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
#[instruction(certificate_id: [u8; 6], template_id: [u8; 6])]
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
        seeds = [b"certificate", company.key().as_ref(), certificate_id.as_ref()],
        bump
    )]
    pub certificate: Account<'info, Certificate>,

    #[account(
        mut,
        seeds = [b"template", company.key().as_ref(), template_id.as_ref()],
        bump = certificate_template.bump,
        constraint = certificate_template.company == company.key() @ CertificationError::InvalidCompany
    )]
    pub certificate_template: Account<'info, CertificateTemplate>,

    #[account(mut)]
    pub company_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeCertificate<'info> {
    #[account(
        mut,
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
pub struct UpdateCompany<'info> {
    #[account(
        mut,
        constraint = company.authority == authority.key() @ CertificationError::Unauthorized
    )]
    pub company: Account<'info, Company>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(template_id: [u8; 6])]
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
        seeds = [b"template", company.key().as_ref(), template_id.as_ref()],
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
#[instruction(award_type_id: [u8; 6])]
pub struct CreateAwardType<'info> {
    #[account(
        constraint = company.authority == company_authority.key() @ CertificationError::Unauthorized
    )]
    pub company: Account<'info, Company>,

    #[account(
        init,
        payer = company_authority,
        space = AwardType::LEN,
        seeds = [b"award_type", company.key().as_ref(), award_type_id.as_ref()],
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
#[instruction(award_id: [u8; 6])]
pub struct MintAwardNFT<'info> {
    #[account(
        mut,
        seeds = [b"company", company.company_id.as_ref()],
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
        mut,
        constraint = award_type.company == company.key() @ CertificationError::InvalidCompany
    )]
    pub award_type: Account<'info, AwardType>,

    #[account(
        init,
        payer = company_authority,
        space = Award::LEN,
        seeds = [b"award", company.key().as_ref(), award_id.as_ref()],
        bump
    )]
    pub award: Account<'info, Award>,

    #[account(
        init,
        payer = company_authority,
        mint::decimals = 0,
        mint::authority = company,
        mint::freeze_authority = company,
        seeds = [b"award_mint", company.key().as_ref(), award_id.as_ref()],
        bump
    )]
    pub mint: Account<'info, Mint>,

    /// CHECK: Employee wallet
    pub employee_wallet: AccountInfo<'info>,

    /// CHECK: Validated in instruction
    #[account(mut)]
    pub recipient_token_account: UncheckedAccount<'info>,

    /// CHECK: Checked by Metaplex
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

#[derive(Accounts)]
pub struct CloseEmployee<'info> {
    #[account(
        mut,
        close = company_authority,
        constraint = employee.company == company.key()
            @ CertificationError::InvalidCompany
    )]
    pub employee: Account<'info, Employee>,

    #[account(
        constraint = company.authority == company_authority.key() 
            @ CertificationError::Unauthorized  // ADD THIS
    )]
    pub company: Account<'info, Company>,

    #[account(mut)]
    pub company_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseCertificate<'info> {
    #[account(
        mut,
        close = company_authority,
        constraint = certificate.company == company.key()
            @ CertificationError::InvalidCompany
    )]
    pub certificate: Account<'info, Certificate>,

    #[account(
        constraint = company.authority == company_authority.key() 
            @ CertificationError::Unauthorized  // ADD THIS
    )]
    pub company: Account<'info, Company>,

    #[account(mut)]
    pub company_authority: Signer<'info>,
}

// ============================================================================
// EVENTS
// ============================================================================

#[event]
pub struct CompanyInitialized {
    pub company: Pubkey,
    pub authority: Pubkey,
    pub company_id: [u8; 6],
    pub timestamp: i64,
    pub version: u8,
}

#[event]
pub struct CompanyAuthorityTransferProposed {
    pub company: Pubkey,
    pub current_authority: Pubkey,
    pub pending_authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CompanyAuthorityTransferred {
    pub company: Pubkey,
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CompanyAuthorityTransferCancelled {
    pub company: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CompanyUpdated {
    pub company: Pubkey,
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
    pub certificate_id: [u8; 6],
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
    pub template_id: [u8; 6],
    pub timestamp: i64,
}

#[event]
pub struct CertificateTemplateUpdated {
    pub template: Pubkey,
    pub company: Pubkey,
    pub template_id: [u8; 6],
    pub timestamp: i64,
}

#[event]
pub struct AwardTypeCreated {
    pub award_type: Pubkey,
    pub company: Pubkey,
    pub award_type_id: [u8; 6],
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
    pub award_id: [u8; 6],
    pub timestamp: i64,
}

#[event]
pub struct EmployeeClosed {
    pub company: Pubkey,
    pub employee: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CertificateClosed {
    pub company: Pubkey,
    pub certificate: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

// ============================================================================
// ERROR CODES
// ============================================================================

#[error_code]
pub enum CertificationError {
    #[msg("CID too long (max 43 characters)")]
    CidTooLong,

    #[msg("Name too long (max 32 characters)")]
    NameTooLong,

    #[msg("URI too long (max 43 characters)")]
    UriTooLong,

    #[msg("Symbol too long (max 10 characters)")]
    SymbolTooLong,

    #[msg("Company is not active")]
    CompanyInactive,

    #[msg("Employee is not active")]
    EmployeeNotActive,

    #[msg("Certificate is not active")]
    CertificateNotActive,

    #[msg("Award type is not active")]
    AwardTypeInactive,

    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("Invalid company")]
    InvalidCompany,

    #[msg("Invalid employee")]
    InvalidEmployee,

    #[msg("Invalid token account")]
    InvalidTokenAccount,

    #[msg("Numerical overflow")]
    NumericalOverflow,

    #[msg("Invalid employee state")]
    InvalidEmployeeState,
    
    #[msg("Employee is still active")]
    EmployeeStillActive,

    #[msg("Certificate cannot be closed")]
    CertificateNotClosable,
}
