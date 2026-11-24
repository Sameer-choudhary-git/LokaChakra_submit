use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};

solana_program::declare_id!("HSQ9vGvZtCy6CbUkgMD2RXeMeQ2dgtDZoUZ7EbRAdA1g");

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if instruction_data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }

    let (instruction_discriminator, rest) = instruction_data.split_at(1);
    let instruction_type = instruction_discriminator[0];

    msg!(
        "Connection Requests: Processing instruction {}",
        instruction_type
    );

    match instruction_type {
        0 => {
            msg!("Instruction: SendConnectionRequest");
            let data = SendRequestData::try_from_slice(rest)
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            send_connection_request(program_id, accounts, data)
        }
        1 => {
            msg!("Instruction: RespondToRequest");
            let data = RespondRequestData::try_from_slice(rest)
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            respond_to_request(program_id, accounts, data)
        }
        2 => {
            msg!("Instruction: FinalApproval");
            let data = FinalApprovalData::try_from_slice(rest)
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            final_approval(program_id, accounts, data)
        }
        3 => {
            msg!("Instruction: RejectRequest");
            let data = RejectRequestData::try_from_slice(rest)
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            reject_request(program_id, accounts, data)
        }
        4 => {
            msg!("Instruction: GetUserRequests");
            get_user_requests(program_id, accounts)
        }
        _ => {
            msg!("Unknown instruction: {}", instruction_type);
            Err(ProgramError::InvalidInstructionData)
        }
    }
}

// Instruction data structures
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct SendRequestData {
    pub receiver: Pubkey,
    pub needs_ipfs_cid: String,
    pub request_id: u64,
    pub message: String, // Optional message
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct RespondRequestData {
    pub request_id: u64,
    pub sender: Pubkey,
    pub receiver_needs_cid: Option<String>,
    pub approve: bool,
    pub message: String, // Optional response message
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct FinalApprovalData {
    pub request_id: u64,
    pub receiver: Pubkey,
    pub approve: bool,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct RejectRequestData {
    pub request_id: u64,
    pub other_party: Pubkey,
}

// Enums and main data structures
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum RequestStatus {
    Pending,     // Initial state - waiting for receiver response
    Negotiating, // Receiver responded with their needs, waiting for sender final approval
    Approved,    // Both parties approved - ready to create agreement
    Rejected,    // Either party rejected
    Cancelled,   // Sender cancelled before response
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct ConnectionRequest {
    pub id: u64,                            // 8 bytes - Unique request ID
    pub sender: Pubkey,                     // 32 bytes - Request sender
    pub receiver: Pubkey,                   // 32 bytes - Request receiver
    pub sender_needs_cid: String,           // 4 + N bytes - IPFS hash for sender's needs
    pub receiver_needs_cid: Option<String>, // 1 + 4 + N bytes - IPFS hash for receiver's needs
    pub status: RequestStatus,              // 1 byte - Current status
    pub created_at: i64,                    // 8 bytes - Creation timestamp
    pub updated_at: i64,                    // 8 bytes - Last update timestamp
    pub sender_approved: bool,              // 1 byte - Sender approval status
    pub receiver_approved: bool,            // 1 byte - Receiver approval status
    pub sender_message: String,             // 4 + N bytes - Optional message from sender
    pub receiver_message: String,           // 4 + N bytes - Optional message from receiver
}

impl ConnectionRequest {
    pub const MAX_SIZE: usize =
        8 + 32 + 32 + (4 + 200) + (1 + 4 + 200) + 1 + 8 + 8 + 1 + 1 + (4 + 100) + (4 + 100); // ~700 bytes
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct UserRequestInbox {
    pub user: Pubkey,               // 32 bytes - User's pubkey
    pub pending_requests: Vec<u64>, // 4 + (8 * N) bytes - Pending incoming request IDs
    pub sent_requests: Vec<u64>,    // 4 + (8 * N) bytes - Sent request IDs (for notifications)
    pub total_received: u32,        // 4 bytes - Total requests received
    pub total_sent: u32,            // 4 bytes - Total requests sent
    pub last_updated: i64,          // 8 bytes - Last inbox update
}

impl UserRequestInbox {
    pub const MAX_SIZE: usize = 32 + (4 + 8 * 50) + (4 + 8 * 50) + 4 + 4 + 8; // Support up to 50 pending + 50 sent
}

// Main functions
pub fn send_connection_request(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: SendRequestData,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let sender_account = next_account_info(account_info_iter)?;
    let request_account = next_account_info(account_info_iter)?;
    let receiver_inbox_account = next_account_info(account_info_iter)?;
    let sender_inbox_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // Verify sender is signer
    if !sender_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Validate input
    if data.needs_ipfs_cid.is_empty() || data.needs_ipfs_cid.len() > 200 {
        msg!("Error: Invalid CID length");
        return Err(ProgramError::InvalidArgument);
    }

    if data.message.len() > 100 {
        msg!("Error: Message too long");
        return Err(ProgramError::InvalidArgument);
    }

    if *sender_account.key == data.receiver {
        msg!("Error: Cannot send request to self");
        return Err(ProgramError::InvalidArgument);
    }

    // Create request account PDA
    let (request_pda, request_bump) = Pubkey::find_program_address(
        &[
            b"request",
            sender_account.key.as_ref(),
            data.receiver.as_ref(),
            &data.request_id.to_le_bytes(),
        ],
        program_id,
    );

    if request_pda != *request_account.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Check if request already exists
    if !request_account.data_is_empty() {
        msg!("Error: Request already exists");
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    // Create request account
    let rent = Rent::get()?;
    let required_lamports = rent.minimum_balance(ConnectionRequest::MAX_SIZE);

    invoke_signed(
        &system_instruction::create_account(
            sender_account.key,
            request_account.key,
            required_lamports,
            ConnectionRequest::MAX_SIZE as u64,
            program_id,
        ),
        &[
            sender_account.clone(),
            request_account.clone(),
            system_program.clone(),
        ],
        &[&[
            b"request",
            sender_account.key.as_ref(),
            data.receiver.as_ref(),
            &data.request_id.to_le_bytes(),
            &[request_bump],
        ]],
    )?;

    // Create connection request data
    let clock = Clock::get()?;
    let connection_request = ConnectionRequest {
        id: data.request_id,
        sender: *sender_account.key,
        receiver: data.receiver,
        sender_needs_cid: data.needs_ipfs_cid.clone(),
        receiver_needs_cid: None,
        status: RequestStatus::Pending,
        created_at: clock.unix_timestamp,
        updated_at: clock.unix_timestamp,
        sender_approved: true, // Sender approves by sending
        receiver_approved: false,
        sender_message: data.message.clone(),
        receiver_message: String::new(),
    };

    // Serialize request data
    connection_request.serialize(&mut &mut request_account.data.borrow_mut()[..])?;

    // Update receiver's inbox
    update_inbox(
        program_id,
        receiver_inbox_account,
        sender_account,
        &data.receiver,
        data.request_id,
        true, // Add to pending
        system_program,
    )?;

    // Update sender's inbox (track sent requests)
    update_inbox(
        program_id,
        sender_inbox_account,
        sender_account,
        sender_account.key,
        data.request_id,
        false, // Add to sent
        system_program,
    )?;

    msg!(
        "Connection request sent successfully: {} -> {}, ID: {}",
        sender_account.key,
        data.receiver,
        data.request_id
    );

    Ok(())
}

pub fn respond_to_request(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: RespondRequestData,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let receiver_account = next_account_info(account_info_iter)?;
    let request_account = next_account_info(account_info_iter)?;
    let receiver_inbox_account = next_account_info(account_info_iter)?;

    // Verify receiver is signer
    if !receiver_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Validate PDA
    let (expected_pda, _) = Pubkey::find_program_address(
        &[
            b"request",
            data.sender.as_ref(),
            receiver_account.key.as_ref(),
            &data.request_id.to_le_bytes(),
        ],
        program_id,
    );

    if expected_pda != *request_account.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Deserialize request
    let mut connection_request = ConnectionRequest::try_from_slice(&request_account.data.borrow())?;
    print!(
        "connection request descypt in responde to req {}",
        connection_request
    );

    // Verify receiver authority
    if connection_request.receiver != *receiver_account.key {
        msg!("Error: Unauthorized access");
        return Err(ProgramError::IllegalOwner);
    }

    // Verify request is in pending state
    if connection_request.status != RequestStatus::Pending {
        msg!("Error: Invalid request status for response");
        return Err(ProgramError::InvalidArgument);
    }

    // Validate receiver needs CID if provided
    if let Some(ref needs) = data.receiver_needs_cid {
        if needs.is_empty() || needs.len() > 200 {
            msg!("Error: Invalid receiver CID length");
            return Err(ProgramError::InvalidArgument);
        }
    }

    if data.message.len() > 100 {
        msg!("Error: Response message too long");
        return Err(ProgramError::InvalidArgument);
    }

    // Update request
    let clock = Clock::get()?;
    connection_request.receiver_needs_cid = data.receiver_needs_cid.clone();
    connection_request.receiver_message = data.message;
    connection_request.updated_at = clock.unix_timestamp;

    if data.approve {
        connection_request.status = if data.receiver_needs_cid.is_some() {
            RequestStatus::Negotiating // Receiver added their needs - sender must give final approval
        } else {
            RequestStatus::Approved // Simple approval - connection ready
        };
        connection_request.receiver_approved = true;
    } else {
        connection_request.status = RequestStatus::Rejected;
        connection_request.receiver_approved = false;
    }

    // Save updated request
    connection_request.serialize(&mut &mut request_account.data.borrow_mut()[..])?;

    // Update receiver's inbox - remove from pending (since they responded)
    remove_from_inbox_pending(receiver_inbox_account, data.request_id)?;

    msg!(
        "Request {} responded to by {}: approved={}",
        data.request_id,
        receiver_account.key,
        data.approve
    );

    Ok(())
}

pub fn final_approval(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: FinalApprovalData,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let sender_account = next_account_info(account_info_iter)?;
    let request_account = next_account_info(account_info_iter)?;

    // Verify sender is signer
    if !sender_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Validate PDA
    let (expected_pda, _) = Pubkey::find_program_address(
        &[
            b"request",
            sender_account.key.as_ref(),
            data.receiver.as_ref(),
            &data.request_id.to_le_bytes(),
        ],
        program_id,
    );

    if expected_pda != *request_account.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Deserialize request
    let mut connection_request = ConnectionRequest::try_from_slice(&request_account.data.borrow())?;

    // Verify sender authority
    if connection_request.sender != *sender_account.key {
        msg!("Error: Unauthorized access");
        return Err(ProgramError::IllegalOwner);
    }

    // Verify request is in negotiating state
    if connection_request.status != RequestStatus::Negotiating {
        msg!("Error: Invalid request status for final approval");
        return Err(ProgramError::InvalidArgument);
    }

    // Update request based on approval
    let clock = Clock::get()?;
    connection_request.updated_at = clock.unix_timestamp;

    if data.approve {
        connection_request.status = RequestStatus::Approved;
        msg!("Final approval granted for request {}", data.request_id);
    } else {
        connection_request.status = RequestStatus::Rejected;
        msg!("Final approval denied for request {}", data.request_id);
    }

    // Save updated request
    connection_request.serialize(&mut &mut request_account.data.borrow_mut()[..])?;

    Ok(())
}

pub fn reject_request(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: RejectRequestData,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let signer_account = next_account_info(account_info_iter)?;
    let request_account = next_account_info(account_info_iter)?;
    let inbox_account = next_account_info(account_info_iter)?;

    // Verify signer
    if !signer_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Deserialize request to check authority
    let mut connection_request = ConnectionRequest::try_from_slice(&request_account.data.borrow())?;

    // Verify signer can reject this request
    if connection_request.sender != *signer_account.key
        && connection_request.receiver != *signer_account.key
    {
        msg!("Error: Unauthorized to reject this request");
        return Err(ProgramError::IllegalOwner);
    }

    // Update status
    connection_request.status = RequestStatus::Rejected;
    let clock = Clock::get()?;
    connection_request.updated_at = clock.unix_timestamp;

    // Save updated request
    connection_request.serialize(&mut &mut request_account.data.borrow_mut()[..])?;

    // Remove from pending if it was the receiver rejecting
    if connection_request.receiver == *signer_account.key {
        remove_from_inbox_pending(inbox_account, data.request_id)?;
    }

    msg!(
        "Request {} rejected by {}",
        data.request_id,
        signer_account.key
    );

    Ok(())
}

pub fn get_user_requests(_program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let _user_account = next_account_info(account_info_iter)?;
    let inbox_account = next_account_info(account_info_iter)?;

    if inbox_account.data_is_empty() {
        msg!("No requests found for user");
        return Ok(());
    }

    let inbox = UserRequestInbox::try_from_slice(&inbox_account.data.borrow())?;

    msg!("User inbox status:");
    msg!(
        "  Pending requests: {} - {:?}",
        inbox.pending_requests.len(),
        inbox.pending_requests
    );
    msg!(
        "  Sent requests: {} - {:?}",
        inbox.sent_requests.len(),
        inbox.sent_requests
    );
    msg!("  Total received: {}", inbox.total_received);
    msg!("  Total sent: {}", inbox.total_sent);

    Ok(())
}

fn update_inbox<'a>(
    program_id: &Pubkey,
    inbox_account: &AccountInfo<'a>,
    payer: &AccountInfo<'a>,
    user: &Pubkey,
    request_id: u64,
    is_pending: bool, // true for receiver inbox, false for sender inbox
    system_program: &AccountInfo<'a>,
) -> ProgramResult {
    let (inbox_pda, inbox_bump) =
        Pubkey::find_program_address(&[b"inbox", user.as_ref()], program_id);

    msg!("Expected inbox PDA: {}", inbox_pda);
    msg!("Provided inbox account: {}", inbox_account.key);

    if inbox_pda != *inbox_account.key {
        msg!("Error: Inbox PDA mismatch");
        return Err(ProgramError::InvalidAccountData);
    }

    // If inbox doesn't exist, create it
    if inbox_account.data_is_empty() {
        msg!("Creating new inbox for user: {}", user);

        let rent = Rent::get()?;
        let required_lamports = rent.minimum_balance(UserRequestInbox::MAX_SIZE);

        let create_inbox_ix = system_instruction::create_account(
            payer.key,
            inbox_account.key,
            required_lamports,
            UserRequestInbox::MAX_SIZE as u64,
            program_id,
        );

        invoke_signed(
            &create_inbox_ix,
            &[payer.clone(), inbox_account.clone(), system_program.clone()],
            &[&[b"inbox", user.as_ref(), &[inbox_bump]]],
        ).map_err(|e| {
            msg!("Error creating inbox account: {:?}", e);
            e
        })?;

        // Initialize inbox
        let clock = Clock::get()?;
        let inbox = UserRequestInbox {
            user: *user,
            pending_requests: if is_pending { vec![request_id] } else { vec![] },
            sent_requests: if is_pending { vec![] } else { vec![request_id] },
            total_received: if is_pending { 1 } else { 0 },
            total_sent: if is_pending { 0 } else { 1 },
            last_updated: clock.unix_timestamp,
        };

        inbox
            .serialize(&mut &mut inbox_account.data.borrow_mut()[..])
            .map_err(|e| {
                msg!("Error serializing new inbox data: {:?}", e);
                ProgramError::AccountDataTooSmall
            })?;

        msg!("Inbox created and initialized successfully");
    } else {
        // Update existing inbox - COMPLETELY REWRITTEN LOGIC
        msg!("Updating existing inbox");

        let account_data_len = inbox_account.data.borrow().len();
        msg!("Inbox account data length: {}", account_data_len);

        // Read the entire account data
        let current_data = inbox_account.data.borrow().to_vec();

        // Try to deserialize, but if it fails, try to manually parse what we can
        let mut inbox = if let Ok(parsed_inbox) = UserRequestInbox::try_from_slice(&current_data) {
            msg!("Successfully deserialized existing inbox");
            msg!("  User: {}", parsed_inbox.user);
            msg!("  Pending requests: {:?}", parsed_inbox.pending_requests);
            msg!("  Sent requests: {:?}", parsed_inbox.sent_requests);
            parsed_inbox
        } else {
            msg!("Deserialization failed, attempting manual recovery");

            // Verify user matches
            if current_data.len() >= 32 {
                let stored_user = Pubkey::new(&current_data[0..32]);
                if stored_user != *user {
                    msg!("User mismatch in corrupted data, creating completely fresh inbox");
                    let clock = Clock::get()?;
                    UserRequestInbox {
                        user: *user,
                        pending_requests: vec![],
                        sent_requests: vec![],
                        total_received: 0,
                        total_sent: 0,
                        last_updated: clock.unix_timestamp,
                    }
                } else {
                    // Try to recover request IDs manually
                    let (recovered_pending, recovered_sent) =
                        try_recover_request_ids(&current_data).unwrap_or((vec![], vec![]));
                    msg!(
                        "Recovered {} pending, {} sent requests",
                        recovered_pending.len(),
                        recovered_sent.len()
                    );

                    let clock = Clock::get()?;
                    UserRequestInbox {
                        user: *user,
                        pending_requests: recovered_pending,
                        sent_requests: recovered_sent,
                        total_received: 0, // Will be updated below
                        total_sent: 0,     // Will be updated below
                        last_updated: clock.unix_timestamp,
                    }
                }
            } else {
                msg!("Account data too small, creating fresh inbox");
                let clock = Clock::get()?;
                UserRequestInbox {
                    user: *user,
                    pending_requests: vec![],
                    sent_requests: vec![],
                    total_received: 0,
                    total_sent: 0,
                    last_updated: clock.unix_timestamp,
                }
            }
        };

        // Update totals based on current lists
        inbox.total_received = inbox.pending_requests.len() as u32;
        inbox.total_sent = inbox.sent_requests.len() as u32;

        // Update totals based on current lists
        inbox.total_received = inbox.pending_requests.len() as u32;
        inbox.total_sent = inbox.sent_requests.len() as u32;

        // Add the new request to the appropriate list
        if is_pending {
            if inbox.pending_requests.len() < 50 {
                // Check for duplicates before adding
                if !inbox.pending_requests.contains(&request_id) {
                    inbox.pending_requests.push(request_id);
                    inbox.total_received += 1;
                    msg!(
                        "Added request {} to pending list (now {} total pending)",
                        request_id,
                        inbox.pending_requests.len()
                    );
                } else {
                    msg!(
                        "Request {} already exists in pending list, skipping",
                        request_id
                    );
                }
            } else {
                msg!("Warning: Inbox full, cannot add more pending requests");
                return Err(ProgramError::AccountDataTooSmall);
            }
        } else {
            if inbox.sent_requests.len() < 50 {
                // Check for duplicates before adding
                if !inbox.sent_requests.contains(&request_id) {
                    inbox.sent_requests.push(request_id);
                    inbox.total_sent += 1;
                    msg!(
                        "Added request {} to sent list (now {} total sent)",
                        request_id,
                        inbox.sent_requests.len()
                    );
                } else {
                    msg!(
                        "Request {} already exists in sent list, skipping",
                        request_id
                    );
                }
            } else {
                msg!("Warning: Inbox full, cannot add more sent requests");
                return Err(ProgramError::AccountDataTooSmall);
            }
        }

        let clock = Clock::get()?;
        inbox.last_updated = clock.unix_timestamp;

        // Serialize with comprehensive error handling and size validation
        let serialized_data = inbox.try_to_vec().map_err(|e| {
            msg!("Error serializing inbox to bytes: {:?}", e);
            msg!(
                "Inbox state: pending={:?}, sent={:?}",
                inbox.pending_requests,
                inbox.sent_requests
            );
            ProgramError::BorshIoError(e.to_string())
        })?;

        let account_data_len = inbox_account.data.borrow().len();
        if serialized_data.len() > account_data_len {
            msg!(
                "Error: Serialized data ({} bytes) exceeds account size ({} bytes)",
                serialized_data.len(),
                account_data_len
            );
            msg!("Try reducing the number of pending/sent requests");
            return Err(ProgramError::AccountDataTooSmall);
        }

        // CRITICAL: Use precise slice assignment instead of fill + copy
        {
            let mut account_data = inbox_account.data.borrow_mut();
            // Only zero out the exact range we'll write to
            for i in 0..serialized_data.len() {
                account_data[i] = serialized_data[i];
            }
            // Zero out any remaining bytes to ensure clean state
            for i in serialized_data.len()..account_data.len() {
                account_data[i] = 0;
            }
        }

        msg!(
            "Inbox updated successfully - {} pending, {} sent (total data: {} bytes)",
            inbox.pending_requests.len(),
            inbox.sent_requests.len(),
            serialized_data.len()
        );
    }

    Ok(())
}

// Helper function to safely deserialize inbox data
fn try_deserialize_inbox(
    data: &[u8],
    expected_user: &Pubkey,
) -> Result<UserRequestInbox, Box<dyn std::error::Error>> {
    if data.len() < 32 {
        return Err("Data too small for inbox".into());
    }

    // Check if the user pubkey matches what we expect
    let stored_user_bytes = &data[0..32];
    let stored_user = Pubkey::new(stored_user_bytes);

    if stored_user != *expected_user {
        return Err(format!(
            "User mismatch: expected {}, found {}",
            expected_user, stored_user
        ).into());
    }

    // Try to deserialize the full struct
    let inbox = UserRequestInbox::try_from_slice(data)
        .map_err(|e| format!("Borsh deserialization failed: {}", e))?;

    // Validate the deserialized data makes sense
    if inbox.pending_requests.len() > 50 || inbox.sent_requests.len() > 50 {
        return Err("Invalid inbox data: too many requests".into());
    }

    Ok(inbox)
}

// Helper function to recover request IDs from corrupted inbox data
fn try_recover_request_ids(
    data: &[u8],
) -> Result<(Vec<u64>, Vec<u64>), Box<dyn std::error::Error>> {
    if data.len() < 40 {
        // Minimum size for user + vector lengths
        return Ok((Vec::new(), Vec::new()));
    }

    // Skip user pubkey (32 bytes)
    let mut offset = 32;

    // Try to read pending requests vector length
    let mut pending_requests = Vec::new();
    if offset + 4 <= data.len() {
        let pending_len = u32::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
        ]) as usize;
        offset += 4;

        // Validate length is reasonable
        if pending_len <= 50 && offset + (pending_len * 8) <= data.len() {
            for i in 0..pending_len {
                let start = offset + (i * 8);
                if start + 8 <= data.len() {
                    let request_id = u64::from_le_bytes([
                        data[start],
                        data[start + 1],
                        data[start + 2],
                        data[start + 3],
                        data[start + 4],
                        data[start + 5],
                        data[start + 6],
                        data[start + 7],
                    ]);
                    pending_requests.push(request_id);
                }
            }
            offset += pending_len * 8;
        }
    }

    // Try to read sent requests vector length
    let mut sent_requests = Vec::new();
    if offset + 4 <= data.len() {
        let sent_len = u32::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
        ]) as usize;
        offset += 4;

        // Validate length is reasonable
        if sent_len <= 50 && offset + (sent_len * 8) <= data.len() {
            for i in 0..sent_len {
                let start = offset + (i * 8);
                if start + 8 <= data.len() {
                    let request_id = u64::from_le_bytes([
                        data[start],
                        data[start + 1],
                        data[start + 2],
                        data[start + 3],
                        data[start + 4],
                        data[start + 5],
                        data[start + 6],
                        data[start + 7],
                    ]);
                    sent_requests.push(request_id);
                }
            }
        }
    }

    Ok((pending_requests, sent_requests))
}

fn remove_from_inbox_pending(inbox_account: &AccountInfo, request_id: u64) -> ProgramResult {
    if inbox_account.data_is_empty() {
        msg!("Warning: Inbox is empty, cannot remove request");
        return Ok(()); // Don't fail if inbox doesn't exist
    }

    let account_data = inbox_account.data.borrow();
    let mut inbox = UserRequestInbox::try_from_slice(&account_data)?;
    drop(account_data); // Release the borrow before mutable borrow

    // Remove request from pending list
    inbox.pending_requests.retain(|&id| id != request_id);

    let clock = Clock::get()?;
    inbox.last_updated = clock.unix_timestamp;

    // Serialize to bytes first
    let serialized_data = inbox.try_to_vec().map_err(|e| {
        msg!("Error serializing inbox for removal: {:?}", e);
        ProgramError::BorshIoError(e.to_string())
    })?;

    // Write to account
    let mut account_data = inbox_account.data.borrow_mut();
    if serialized_data.len() > account_data.len() {
        return Err(ProgramError::AccountDataTooSmall);
    }

    account_data[..].fill(0);
    account_data[..serialized_data.len()].copy_from_slice(&serialized_data);

    Ok(())
}
