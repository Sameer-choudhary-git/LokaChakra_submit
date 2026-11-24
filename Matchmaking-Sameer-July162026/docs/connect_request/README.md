# Web3 Connect - Professional Networking Platform

A Solana-based professional networking app for sending, responding to, and managing on-chain connection requests.

## Overview

This project is split into three main parts:

- **Frontend app** in `app/`
- **Client blockchain layer** in `lib/`
- **On-chain Rust program** in `connection-program/`

It supports wallet connection, request creation, inbox management, and status tracking on **Solana Devnet**.

## Core Setup

### Prerequisites

Install the following before running the project:

- **Node.js** 18 or newer
- **npm** or **pnpm**
- A Solana wallet extension such as Phantom or Solflare
- Access to the configured Solana Devnet RPC endpoint

### Installation

```bash
npm install
```

### Environment and Configuration

The main Solana settings are centralized in `lib/config.ts`:

- `RPC_ENDPOINT`
- `PROGRAM_ID_STRING`
- `PROGRAM_ID`

Current defaults:

- RPC: `https://api.devnet.solana.com`
- Program ID: `2J4i6ptZ7Ws4i3c1gqHSJNUsih1oPxPsk9XSQLgpSkW2`

Update these values if the program is redeployed or if you move to another Solana network.

### Run the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Production

```bash
npm run build
npm start
```

## Project Structure

- `app/` - Next.js pages and routes
- `components/` - Wallet and UI components
- `connection-program/` - Rust Solana program source
- `lib/` - Client-side Solana helpers and configuration
- `run.js` / `runMannual.js` - Local execution helpers
- `README-CONFIG.md` - Additional configuration notes
- `DEPLOYMENT.md` - Deployment guidance
- `package.json` - Scripts and dependencies

## Main `lib/` Files

### `lib/config.ts`

Centralized Solana configuration.

#### Exports

- `RPC_ENDPOINT`
- `PROGRAM_ID_STRING`
- `PROGRAM_ID`
- `SOLANA_CONFIG`

#### Purpose

- Stores the active RPC endpoint
- Stores the program ID for the connection request contract
- Validates the config on import

### `lib/solana-program.ts`

This file contains the client-side instruction builders and account helpers.

#### Main exports

- `InstructionType`
- `RequestStatus`
- `SendRequestData`
- `RespondRequestData`
- `FinalApprovalData`
- `RejectRequestData`
- `ConnectionRequest`
- `UserRequestInbox`
- `getRequestPDA`
- `getInboxPDA`
- `createSendConnectionRequestInstruction`
- `createRespondToRequestInstruction`
- `createFinalApprovalInstruction`
- `createRejectRequestInstruction`
- `createGetUserRequestsInstruction`
- `fetchConnectionRequest`
- `fetchUserInbox`
- `findConnectionRequestsByIds`
- `findConnectionRequestsForUser`
- `getConnectionRequestsFromInbox`

#### What this file does

1. Serializes instruction payloads with custom buffer readers and writers
2. Derives PDAs for:
   - request accounts
   - user inbox accounts
3. Builds Solana transactions for:
   - sending connection requests
   - responding to requests
   - final approval
   - rejection
   - inbox lookup
4. Reads and deserializes request and inbox account data from chain

#### PDA derivation

- **Request PDA**
  - Seed: `"request"`
  - Sender public key
  - Receiver public key
  - Request ID

- **Inbox PDA**
  - Seed: `"inbox"`
  - User public key

#### Request lifecycle

Supported request statuses:

- `Pending`
- `Negotiating`
- `Approved`
- `Rejected`
- `Cancelled`

### `lib/ipfs.ts`

This file handles IPFS-related data handling for request metadata.

#### Purpose

- Stores or resolves request metadata
- Supports IPFS-style request payload references
- Used by the UI before sending request content on-chain

### `lib/use-solana-program.ts`

React hook wrapper around the Solana request helpers.

#### Purpose

- Exposes request actions to the UI
- Simplifies sending and managing requests from React components
- Connects wallet state to blockchain actions

## On-Chain Smart Contract

The Rust program lives in:

```text
connection-program/src/lib.rs
```

### Program ID

```text
HSQ9vGvZtCy6CbUkgMD2RXeMeQ2dgtDZoUZ7EbRAdA1g
```

### Main Instructions

The program supports these instruction types:

- `SendConnectionRequest`
- `RespondToRequest`
- `FinalApproval`
- `RejectRequest`
- `GetUserRequests`

### Account Types

#### `ConnectionRequest`

Stores the full request state:

- request ID
- sender and receiver public keys
- sender CID
- optional receiver CID
- status
- timestamps
- approval flags
- sender and receiver messages

#### `UserRequestInbox`

Stores per-user request tracking:

- user public key
- pending request IDs
- sent request IDs
- total received count
- total sent count
- last updated timestamp

### Validation Rules

The contract enforces:

- sender must sign the request
- sender cannot send a request to themselves
- CID length must be valid
- messages must not exceed the allowed length
- PDAs must match the expected derivation
- only authorized users can respond, approve, or reject

### Request Flow

1. **SendConnectionRequest**
   - Creates the request account
   - Stores initial request data
   - Adds the request to sender and receiver inboxes

2. **RespondToRequest**
   - Receiver approves or rejects
   - Receiver may add their own CID and message
   - Request status changes to `Negotiating`, `Approved`, or `Rejected`

3. **FinalApproval**
   - Sender performs final approval after negotiation
   - Request status changes to `Approved` or `Rejected`

4. **RejectRequest**
   - Either party may reject the request
   - Pending inbox entries are updated accordingly

5. **GetUserRequests**
   - Reads inbox state for the current user

## Frontend Features

- Wallet connection
- Professional discovery
- Connection request submission
- Request inbox and response handling
- Solana Devnet transaction flow
- On-chain request status tracking

## Development Notes

- The app currently targets **Solana Devnet**
- Program IDs and RPC values are centralized in `lib/config.ts`
- `lib/solana-program.ts` is the main bridge between the UI and the Rust program
- `connection-program/src/lib.rs` defines the canonical request data model
- The UI reads request and inbox data directly from Solana accounts

## Troubleshooting

### Dependency Install Fails

```bash
npm install
```

### Development Server Fails to Start

Check for missing dependencies, invalid environment settings, or port conflicts, then retry:

```bash
npm run dev
```

### Wallet Connection Issues

- Confirm the wallet extension is installed and unlocked
- Ensure the wallet is set to the correct Solana network
- Verify the RPC endpoint in `lib/config.ts`

### Transaction or PDA Errors

- Confirm the `PROGRAM_ID_STRING` matches the deployed Rust program
- Verify the request ID and sender/receiver keys used to derive PDAs
- Check that the program is deployed on the same network as the frontend

## Deployment Notes

- Keep `lib/config.ts` synchronized with the deployed program
- Redeploy the Rust program if instruction layouts change
- Update any UI helpers if the account schema changes
- Review `DEPLOYMENT.md` before publishing to another network