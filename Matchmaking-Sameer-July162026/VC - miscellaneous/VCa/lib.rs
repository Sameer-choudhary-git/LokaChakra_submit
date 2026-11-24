use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    borsh::try_from_slice_unchecked,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    program::{invoke_signed},
    sysvar::{rent::Rent, Sysvar},
};

/// The structure to be stored in the PDA account.
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct TransactionData {
    pub transaction_id: String,
    pub wallet_address: Pubkey,
    pub types: Vec<String>,
}

/// Instruction data input from client
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct InitData {
    pub transaction_id: String,
    pub types: Vec<String>,
}

/// Program entrypoint
entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    let signer = next_account_info(accounts_iter)?; // Signer wallet
    let pda_account = next_account_info(accounts_iter)?; // PDA Account
    let system_program = next_account_info(accounts_iter)?; // System program

    let data = InitData::try_from_slice(instruction_data)?;

    // Derive PDA
    let (pda, bump) = Pubkey::find_program_address(&[b"txn_data", signer.key.as_ref()], program_id);

    if pda != *pda_account.key {
        return Err(ProgramError::InvalidArgument);
    }

    // Create account if not initialized
    if pda_account.data_is_empty() {
        let space: usize = 1024; // adjust based on expected size
        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(space);

        invoke_signed(
            &system_instruction::create_account(
                signer.key,
                &pda,
                lamports,
                space as u64,
                program_id,
            ),
            &[signer.clone(), pda_account.clone(), system_program.clone()],
            &[&[b"txn_data", signer.key.as_ref(), &[bump]]],
        )?;
    }

    // Serialize and save data
    let txn_data = TransactionData {
        transaction_id: data.transaction_id,
        wallet_address: *signer.key,
        types: data.types,
    };

    txn_data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;

    msg!("✅ Data stored to PDA successfully");

    Ok(())
}
