# web3-matchmaking

A Next.js-based Web3 matchmaking application built with Solana wallet tooling, Anchor, Tailwind CSS, and a component-driven UI.

## Overview

This project is organized into three main layers:

- **Application layer** in `app/`
- **Client blockchain layer** in `lib/`
- **Reusable UI and provider layer** in `components/` and `hooks/`

It combines wallet connection, profile onboarding, blockchain-backed agreement handling, and IPFS-based profile storage.

## Core Setup

### Prerequisites

Install the following before running the project:

- **Node.js** 18 or newer
- **pnpm**
- A Solana wallet extension such as Phantom
- Access to the required Solana RPC, Pinata/IPFS, and backend API configuration

### Installation

```bash
npm install
```

### Environment Variables

Create a local environment file such as `.env.local` and configure values for:

- Solana RPC endpoint
- Wallet adapter or blockchain configuration
- Pinata / IPFS credentials
- Any API keys used by app routes or queue endpoints

### Run Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Production

```bash
pnpm build
pnpm start
```

## Project Structure

- `app/` - Next.js app router pages and route handlers
- `components/` - Shared UI, wallet provider, theme provider, and feature components
- `hooks/` - Reusable React hooks
- `lib/` - Blockchain, IPFS, search, and utility logic
- `public/` - Static assets
- `styles/` - Global CSS
- `package.json` - Scripts and dependencies
- `pnpm-workspace.yaml` - Workspace configuration

## Scripts

From `package.json`:

- `pnpm dev` - Start the development server
- `pnpm build` - Build the app
- `pnpm start` - Run the production server
- `pnpm lint` - Run lint checks

## `lib/` Documentation

### `lib/blockchain.js`

This file contains the main client-side Solana profile flow.

#### Main exports

- `uploadDataToBlockchain(cid, wallet, role)`
- `getUserDataFromBlockchain(publicKey)`

#### What `uploadDataToBlockchain` does

1. Validates that the wallet is connected
2. Converts the selected role into a boolean role map
3. Serializes the IPFS CID and role flags into instruction data
4. Derives the profile PDA using:
   - seed: `"profile"`
   - wallet public key
   - program ID `DdFexgvdu3uRGjgwBLXnLFzUVK1Vsjxyz473AovCfwcv`
5. Checks whether a profile account already exists
6. Builds and sends a Solana transaction on **Devnet**
7. Confirms the transaction using the latest blockhash and last valid block height
8. Sends the confirmed payload to `/api/queue-user` for server-side processing

#### Data model in this file

The profile payload includes:

- `profilePDA`
- `role`
- `cid`
- `signature`
- `userPublicKey`
- `timestamp`
- `status: pending_validation`

#### Role mapping

Supported roles include:

- founder
- investor
- accelerator
- executive
- legal
- government
- cybersecurity
- freelancer
- mentor_research
- exit_planner

#### `getUserDataFromBlockchain`

This helper:

1. Derives the profile PDA from a public key
2. Reads the on-chain account
3. Extracts the IPFS CID from the serialized account data
4. Fetches the full user profile from IPFS through `pinata.js`

### `lib/pinata.js`

This file handles IPFS / Pinata access.

#### Main exports

- `getHash(user)`
- `getUserDataFromHash(cid)`

#### Purpose

- Upload or resolve user data hashes
- Fetch profile metadata from IPFS content by CID

### `lib/sdk-agreement.ts`

This file provides the agreement smart contract SDK for the matchmaking workflow.

#### Program ID

- `HSQ9vGvZtCy6CbUkgMD2RXeMeQ2dgtDZoUZ7EbRAdA1g`

#### Main exports

- `MatchAgreementSDK`
- `PROGRAM_ID`
- `InstructionType`
- `AgreementErrorCode`

#### Instruction types

- `CreateAgreement`
- `AcceptAgreement`
- `CloseAgreement`
- `MarkCheckpointDone`
- `GetAgreementStatus`
- `ReopenAgreement`

#### Agreement account shape

The agreement account stores:

- matcher public key
- matchee public key
- acceptance state
- metadata CID
- total checkpoints
- checkpoint completion flags
- completion and close status
- PDA bump

#### PDA derivation

Agreement PDAs are derived using:

- seed: `"agreement"`
- matcher public key
- matchee public key
- program ID

#### Instruction behavior

- **CreateAgreement**  
  Creates a new agreement with metadata CID and checkpoint count

- **AcceptAgreement**  
  Marks the matchee as accepting the agreement

- **CloseAgreement**  
  Closes the agreement

- **MarkCheckpointDone**  
  Marks a checkpoint as completed by index

- **GetAgreementStatus**  
  Reads agreement status data

- **ReopenAgreement**  
  Reopens a closed agreement

#### Validation rules

- Total checkpoints must be greater than 0
- Maximum checkpoints allowed is 50
- Metadata CID length must be 200 characters or less

#### Read helpers

The SDK also includes helpers to:

- fetch a single agreement
- fetch all agreements for a user
- compute progress percentage
- format agreement data for display
- confirm transactions

## App-Level Features

- Wallet connection flow
- Onboarding and profile flows
- Dashboard and matches pages
- Agreement-related screens
- API routes under `app/api`
- Reusable UI components and hooks

## Notes

- `components/wallet-provider.tsx` likely handles wallet adapter setup.
- `lib/blockchain.js` is the main client-side bridge between the UI and Solana.
- `lib/sdk-agreement.ts` is the contract-specific SDK for matchmaking agreements.
- `app/` contains the UI pages that consume these blockchain utilities.
- If the app depends on remote services, configure the environment variables before starting the app.

## Troubleshooting

### Dependency Install Fails

```bash
npm install
```

### Development Server Fails to Start

Check environment variables and port conflicts, then retry:

```bash
npm run dev
```

### Wallet Connection Issues

- Confirm the wallet extension is installed and unlocked
- Ensure the configured Solana network is reachable
- Verify the wallet provider configuration

## Maintenance

Keep these updated when the app changes:

- environment variables
- setup steps
- blockchain and contract program IDs
- queue or API endpoints
- deployment instructions