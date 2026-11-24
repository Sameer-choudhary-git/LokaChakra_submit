# Smart Contract Deployment Guide

## Overview
The Web3 Connect application requires a Solana smart contract to be deployed before real blockchain transactions can work. Currently, the application is set to test mode by default.

## Current Program ID
```
HSQ9vGvZtCy6CbUkgMD2RXeMeQ2dgtDZoUZ7EbRAdA1g
```

## Deployment Status
❌ **Not Deployed** - The smart contract is not currently deployed to Solana devnet/mainnet.

## How to Deploy

### Prerequisites
1. Install Rust: https://rustup.rs/
2. Install Solana CLI: https://docs.solana.com/cli/install-solana-cli-tools
3. Install Anchor Framework: https://www.anchor-lang.com/docs/installation

### Steps
1. **Build the program:**
   ```bash
   cargo build-bpf
   ```

2. **Deploy to devnet:**
   ```bash
   solana config set --url devnet
   solana program deploy target/deploy/connect_request.so
   ```

3. **Update the program ID:**
   - Copy the new program ID from deployment output
   - Update `PROGRAM_ID` in `lib/solana-program.ts`
   - Update `declare_id!` in `lib.rs`

4. **Test the deployment:**
   - Switch to "Live Mode" in the application
   - Try sending a connection request

## Alternative: Using Test Mode
The application includes a comprehensive test mode that simulates all blockchain interactions without requiring deployment:

1. Keep "Test Mode" enabled (default)
2. All features work with simulated data
3. Perfect for demonstrations and development

## Rust Program Structure
- `lib.rs` - Main smart contract code
- Program handles connection requests, responses, and user inboxes
- Uses Program Derived Addresses (PDAs) for account management
- Implements Borsh serialization for data structures

## TypeScript Integration
- `lib/solana-program.ts` - Client-side integration
- `lib/use-solana-program.ts` - React hooks
- Matches Rust data structures exactly
- Comprehensive error handling

## Troubleshooting
1. **"Program not found"** - Contract not deployed or wrong network
2. **"Invalid instruction data"** - Serialization mismatch between TS and Rust
3. **"Insufficient funds"** - Need SOL for transaction fees
4. **"User rejected"** - Transaction rejected in wallet

## Network Configuration
- Devnet: `https://api.devnet.solana.com`
- Mainnet: `https://api.mainnet-beta.solana.com`
- Local: `http://localhost:8899`

Update the network in `components/wallet-provider.tsx` if needed.
