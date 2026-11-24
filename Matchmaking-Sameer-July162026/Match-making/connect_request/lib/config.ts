/**
 * Centralized configuration for Solana connection and program settings
 * 
 * Update these values to change the RPC endpoint and program ID for the entire project
 */

import { PublicKey } from "@solana/web3.js"

// ==================================================
// CONFIGURATION - EDIT THESE VALUES AS NEEDED
// ==================================================

/**
 * Solana RPC Endpoint
 * 
 * Common options:
 * - "https://api.devnet.solana.com" (Solana Devnet)
 * - "https://api.mainnet-beta.solana.com" (Solana Mainnet)
 * - "http://localhost:8899" (Local validator)
 * - Custom RPC URLs (Helius, QuickNode, etc.)
 */
export const RPC_ENDPOINT = "https://api.devnet.solana.com"

/**
 * Program ID for the connection request smart contract
 * 
 * This should be the deployed program ID on your target network
 */
export const PROGRAM_ID_STRING = "2J4i6ptZ7Ws4i3c1gqHSJNUsih1oPxPsk9XSQLgpSkW2"

// ==================================================
// DERIVED VALUES - DO NOT EDIT BELOW THIS LINE
// ==================================================

/**
 * Program ID as PublicKey object
 */
export const PROGRAM_ID = new PublicKey(PROGRAM_ID_STRING)

/**
 * Configuration object for easy access
 */
export const SOLANA_CONFIG = {
  rpcEndpoint: RPC_ENDPOINT,
  programId: PROGRAM_ID,
  programIdString: PROGRAM_ID_STRING,
} as const

/**
 * Validate configuration on import
 */
try {
  // Validate RPC endpoint format
  new URL(RPC_ENDPOINT)
  
  // Validate Program ID format
  new PublicKey(PROGRAM_ID_STRING)
  
  console.log("✅ Solana configuration loaded successfully:", {
    rpcEndpoint: RPC_ENDPOINT,
    programId: PROGRAM_ID_STRING
  })
} catch (error) {
  console.error("❌ Invalid Solana configuration:", error)
  throw new Error(`Invalid Solana configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
}
