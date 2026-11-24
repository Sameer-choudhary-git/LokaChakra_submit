use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    borsh::try_from_slice_unchecked,
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction, system_program,
    sysvar::Sysvar,
};

solana_program::declare_id!("91g27T6WVZqi9Wxxm5znU86YKFp95LRzaH7tSdmwcUcr");
entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if instruction_data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }

    // Get instruction discriminator (first byte)
    let (instruction_discriminator, rest) = instruction_data.split_at(1);
    let instruction_type = instruction_discriminator[0];
    msg!(
        "from program inst,  instruction data = {:?}",
        instruction_data
    );

    match instruction_type {
        0 => {
            msg!("Instruction: CreateProfile");
            let create_data = CreateProfileData::try_from_slice(rest)
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            create_profile(
                program_id,
                accounts,
                create_data.ipfs_cid,
                create_data.roles,
            )
        }
        1 => {
            msg!("Instruction: UpdateProfile");
            let update_data = UpdateProfileData::try_from_slice(rest)
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            update_profile(
                program_id,
                accounts,
                update_data.ipfs_cid,
                update_data.roles,
            )
        }
        2 => {
            msg!("Instruction: DeactivateProfile");
            deactivate_profile(program_id, accounts)
        }
        3 => {
            msg!("Unknown instruction: {}", instruction_type);
            Err(ProgramError::InvalidInstructionData)
        }
        _ => {
            msg!("Unknown instruction: {}", instruction_type);
            Err(ProgramError::InvalidInstructionData)
        }
    }
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct CreateProfileData {
    pub ipfs_cid: String,
    pub roles: UserRoles,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct UpdateProfileData {
    pub ipfs_cid: String,
    pub roles: UserRoles,
}

// Role flags structure
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub struct UserRoles {
    pub founder: bool,
    pub investor: bool,
    pub accelerator: bool,
    pub executive: bool,
    pub legal: bool,
    pub government: bool,
    pub cybersecurity: bool,
    pub freelancer: bool,
    pub mentor_research: bool,
    pub exit_planner: bool,
}

impl Default for UserRoles {
    fn default() -> Self {
        Self {
            founder: false,
            investor: false,
            accelerator: false,
            executive: false,
            legal: false,
            government: false,
            cybersecurity: false,
            freelancer: false,
            mentor_research: false,
            exit_planner: false,
        }
    }
}

// Restructured Profile data structure - roles first, IPFS CID at the end
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Profile {
    pub authority: Pubkey,     // 32 bytes
    pub is_active: bool,       // 1 byte
    pub created_at: i64,       // 8 bytes
    pub updated_at: i64,       // 8 bytes
    // Role flags moved to beginning (after core fields)
    pub founder: bool,         // 1 byte
    pub investor: bool,        // 1 byte
    pub accelerator: bool,     // 1 byte
    pub executive: bool,       // 1 byte
    pub legal: bool,           // 1 byte
    pub government: bool,      // 1 byte
    pub cybersecurity: bool,   // 1 byte
    pub freelancer: bool,      // 1 byte
    pub mentor_research: bool, // 1 byte
    pub exit_planner: bool,    // 1 byte
    // IPFS CID moved to the end
    pub ipfs_cid: String,      // 4 + N bytes (Borsh serializes strings as length-prefixed)
}

impl Profile {
    pub const MAX_SIZE: usize = 32 + // authority
                               1 + // is_active
                               8 + // created_at
                               8 + // updated_at
                               10 + // 10 boolean role flags
                               4 + 100; // ipfs_cid (String with max 100 chars)
}

// Error types
#[derive(Debug)]
pub enum ProfileError {
    InvalidInstruction,
    InvalidCID,
    Unauthorized,
    AccountAlreadyExists,
    AccountNotFound,
    InvalidAccount,
    DeserializationError,
    NoRolesSelected,
}

impl From<ProfileError> for ProgramError {
    fn from(e: ProfileError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

// Create profile function
pub fn create_profile(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    ipfs_cid: String,
    roles: UserRoles,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let user_account = next_account_info(account_info_iter)?;
    let profile_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !user_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if ipfs_cid.is_empty() || ipfs_cid.len() > 100 {
        return Err(ProfileError::InvalidCID.into());
    }

    // Validate that at least one role is selected
    if !roles.founder
        && !roles.investor
        && !roles.accelerator
        && !roles.executive
        && !roles.legal
        && !roles.government
        && !roles.cybersecurity
        && !roles.freelancer
        && !roles.mentor_research
        && !roles.exit_planner
    {
        return Err(ProfileError::NoRolesSelected.into());
    }

    msg!("in create function, after ipfs cid check");
    let (profile_pda, profile_bump) =
        Pubkey::find_program_address(&[b"profile", user_account.key.as_ref()], program_id);

    // Verify the provided profile account matches our PDA
    if profile_pda != *profile_account.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Check if account already exists
    if !profile_account.data_is_empty() {
        return Err(ProfileError::AccountAlreadyExists.into());
    }

    // Calculate rent
    let rent = Rent::get()?;
    let required_lamports = rent.minimum_balance(Profile::MAX_SIZE);

    // Create the profile account
    invoke_signed(
        &system_instruction::create_account(
            user_account.key,
            profile_account.key,
            required_lamports,
            Profile::MAX_SIZE as u64,
            program_id,
        ),
        &[
            user_account.clone(),
            profile_account.clone(),
            system_program.clone(),
        ],
        &[&[b"profile", user_account.key.as_ref(), &[profile_bump]]],
    )?;

    // Get current timestamp
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;

    // Create profile data with restructured field order
    let profile = Profile {
        authority: *user_account.key,
        is_active: true,
        created_at: timestamp,
        updated_at: timestamp,
        // Role flags now come before IPFS CID
        founder: roles.founder,
        investor: roles.investor,
        accelerator: roles.accelerator,
        executive: roles.executive,
        legal: roles.legal,
        government: roles.government,
        cybersecurity: roles.cybersecurity,
        freelancer: roles.freelancer,
        mentor_research: roles.mentor_research,
        exit_planner: roles.exit_planner,
        // IPFS CID at the end
        ipfs_cid,
    };

    // Serialize and save profile data
    profile.serialize(&mut &mut profile_account.data.borrow_mut()[..])?;

    msg!(
        "Profile created successfully for user: {}",
        user_account.key
    );
    Ok(())
}

// Update profile function with better error handling - FIXED
pub fn update_profile(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    new_ipfs_cid: String,
    new_roles: UserRoles,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let user_account = next_account_info(account_info_iter)?;
    let profile_account = next_account_info(account_info_iter)?;

    // Log the profile account pubkey
    msg!("Profile account pubkey: {}", profile_account.key);

    // Verify signer
    if !user_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    msg!("after checking signer");

    // Validate IPFS CID
    if new_ipfs_cid.is_empty() || new_ipfs_cid.len() > 100 {
        return Err(ProfileError::InvalidCID.into());
    }

    // Validate that at least one role is selected
    if !new_roles.founder
        && !new_roles.investor
        && !new_roles.accelerator
        && !new_roles.executive
        && !new_roles.legal
        && !new_roles.government
        && !new_roles.cybersecurity
        && !new_roles.freelancer
        && !new_roles.mentor_research
        && !new_roles.exit_planner
    {
        return Err(ProfileError::NoRolesSelected.into());
    }

    // Verify profile account ownership
    if profile_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    // Generate expected PDA
    let (expected_pda, _) =
        Pubkey::find_program_address(&[b"profile", user_account.key.as_ref()], program_id);

    if expected_pda != *profile_account.key {
        return Err(ProgramError::InvalidAccountData);
    }
    msg!("expected_pda = {}", expected_pda);

    // Try safer deserialization with better error handling
    // IMPORTANT: Create a scope to ensure the immutable borrow is dropped
    let mut profile = {
        let data = profile_account.data.borrow();
        msg!("Account data length: {}", data.len());
        msg!("First 20 bytes: {:?}", &data[..20.min(data.len())]);

        match Profile::try_from_slice(&data) {
            Ok(profile) => {
                msg!("Successfully deserialized profile");
                profile
            }
            Err(e) => {
                msg!("Deserialization error: {:?}", e);

                // Try alternative deserialization approach
                match try_from_slice_unchecked::<Profile>(&data) {
                    Ok(profile) => {
                        msg!("Successfully deserialized with unchecked method");
                        profile
                    }
                    Err(e2) => {
                        msg!("Both deserialization methods failed: {:?}, {:?}", e, e2);
                        return Err(ProfileError::DeserializationError.into());
                    }
                }
            }
        }
    }; // The immutable borrow of `data` is dropped here

    msg!("Deserialized profile data: {:?}", profile);

    // Verify authority
    if profile.authority != *user_account.key {
        return Err(ProfileError::Unauthorized.into());
    }

    // Update profile
    let clock = Clock::get()?;
    profile.updated_at = clock.unix_timestamp;

    // Update all role flags
    profile.founder = new_roles.founder;
    profile.investor = new_roles.investor;
    profile.accelerator = new_roles.accelerator;
    profile.executive = new_roles.executive;
    profile.legal = new_roles.legal;
    profile.government = new_roles.government;
    profile.cybersecurity = new_roles.cybersecurity;
    profile.freelancer = new_roles.freelancer;
    profile.mentor_research = new_roles.mentor_research;
    profile.exit_planner = new_roles.exit_planner;

    // Update IPFS CID (now at the end)
    profile.ipfs_cid = new_ipfs_cid;

    // Now we can safely borrow mutably since the immutable borrow was dropped
    match profile.serialize(&mut &mut profile_account.data.borrow_mut()[..]) {
        Ok(_) => {
            msg!("Successfully serialized updated profile");
        }
        Err(e) => {
            msg!("Serialization error: {:?}", e);
            return Err(ProgramError::InvalidAccountData);
        }
    }

    msg!(
        "Profile updated successfully for user: {}",
        user_account.key
    );
    Ok(())
}

// Deactivate profile function with better error handling - FIXED
pub fn deactivate_profile(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let user_account = next_account_info(account_info_iter)?;
    let profile_account = next_account_info(account_info_iter)?;

    // Verify signer
    if !user_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify profile account ownership
    if profile_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    // Generate expected PDA
    let (expected_pda, _) =
        Pubkey::find_program_address(&[b"profile", user_account.key.as_ref()], program_id);

    if expected_pda != *profile_account.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Deserialize existing profile with error handling
    // IMPORTANT: Create a scope to ensure the immutable borrow is dropped
    let mut profile = {
        let data = profile_account.data.borrow();
        match Profile::try_from_slice(&data) {
            Ok(profile) => profile,
            Err(e) => {
                msg!("Deserialization error in deactivate: {:?}", e);
                return Err(ProfileError::DeserializationError.into());
            }
        }
    }; // The immutable borrow is dropped here

    // Verify authority
    if profile.authority != *user_account.key {
        return Err(ProfileError::Unauthorized.into());
    }

    // Deactivate profile
    let clock = Clock::get()?;
    profile.is_active = false;
    profile.updated_at = clock.unix_timestamp;

    // Now we can safely borrow mutably
    profile.serialize(&mut &mut profile_account.data.borrow_mut()[..])?;

    msg!(
        "Profile deactivated successfully for user: {}",
        user_account.key
    );
    Ok(())
}

// Helper function for debugging account data - Updated for new structure
pub fn debug_account_data(data: &[u8]) {
    msg!("Account data debug:");
    msg!("Length: {}", data.len());

    if data.len() >= 32 {
        let authority_bytes = &data[0..32];
        msg!("Authority bytes: {:?}", authority_bytes);
    }

    if data.len() >= 33 {
        let is_active = data[32] != 0;
        msg!("Is active: {}", is_active);
    }

    if data.len() >= 41 {
        let created_at = i64::from_le_bytes([
            data[33], data[34], data[35], data[36], data[37], data[38], data[39], data[40],
        ]);
        msg!("Created at: {}", created_at);
    }

    if data.len() >= 49 {
        let updated_at = i64::from_le_bytes([
            data[41], data[42], data[43], data[44], data[45], data[46], data[47], data[48],
        ]);
        msg!("Updated at: {}", updated_at);
    }

    // Role flags now come after updated_at (bytes 49-58)
    if data.len() >= 59 {
        msg!("Role flags:");
        msg!("  Founder: {}", data[49] != 0);
        msg!("  Investor: {}", data[50] != 0);
        msg!("  Accelerator: {}", data[51] != 0);
        msg!("  Executive: {}", data[52] != 0);
        msg!("  Legal: {}", data[53] != 0);
        msg!("  Government: {}", data[54] != 0);
        msg!("  Cybersecurity: {}", data[55] != 0);
        msg!("  Freelancer: {}", data[56] != 0);
        msg!("  Mentor/Research: {}", data[57] != 0);
        msg!("  Exit Planner: {}", data[58] != 0);
    }

    // IPFS CID now comes at the end
    if data.len() >= 63 {
        let string_len = u32::from_le_bytes([data[59], data[60], data[61], data[62]]);
        msg!("IPFS CID length: {}", string_len);

        if data.len() >= 63 + string_len as usize {
            let string_bytes = &data[63..63 + string_len as usize];
            msg!("IPFS CID bytes: {:?}", string_bytes);

            if let Ok(string_val) = String::from_utf8(string_bytes.to_vec()) {
                msg!("IPFS CID value: {}", string_val);
            }
        }
    }
}