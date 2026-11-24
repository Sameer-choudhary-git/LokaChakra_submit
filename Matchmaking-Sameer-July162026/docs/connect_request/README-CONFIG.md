# Solana Configuration Guide

This project uses a centralized configuration system to manage RPC endpoints and Program IDs. All Solana-related settings are centralized in a single file for easy management.

## Configuration File

All Solana configuration is managed in: `lib/config.ts`

## How to Change Settings

### 1. Change RPC Endpoint

Edit the `RPC_ENDPOINT` constant in `lib/config.ts`:

```typescript
// Common options:
export const RPC_ENDPOINT = "https://api.devnet.solana.com"        // Solana Devnet
// export const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com" // Solana Mainnet  
// export const RPC_ENDPOINT = "http://localhost:8899"              // Local validator
// export const RPC_ENDPOINT = "https://your-custom-rpc-url.com"    // Custom RPC
```

### 2. Change Program ID

Edit the `PROGRAM_ID_STRING` constant in `lib/config.ts`:

```typescript
export const PROGRAM_ID_STRING = "HSQ9vGvZtCy6CbUkgMD2RXeMeQ2dgtDZoUZ7EbRAdA1g"
```

Replace with your deployed program ID.

### 3. Save and Restart

After making changes:
1. Save the `lib/config.ts` file
2. Restart your development server: `npm run dev`
3. The new settings will apply to the entire application

## Configuration Validation

The configuration file automatically validates:
- ✅ RPC endpoint URL format
- ✅ Program ID format (valid Solana public key)
- ✅ Displays loaded configuration in console

## Files That Use This Configuration

The centralized configuration is used by:

- `lib/solana-program.ts` - Smart contract interactions
- `components/wallet-provider.tsx` - Wallet connection
- All pages and components that interact with Solana

## Example Configurations

### For Development (Local Validator)
```typescript
export const RPC_ENDPOINT = "http://localhost:8899"
export const PROGRAM_ID_STRING = "YourLocalProgramId..."
```

### For Testing (Devnet)
```typescript
export const RPC_ENDPOINT = "https://api.devnet.solana.com"
export const PROGRAM_ID_STRING = "YourDevnetProgramId..."
```

### For Production (Mainnet)
```typescript
export const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com"
export const PROGRAM_ID_STRING = "YourMainnetProgramId..."
```

### For Custom RPC Provider
```typescript
export const RPC_ENDPOINT = "https://solana-mainnet.g.alchemy.com/v2/your-api-key"
export const PROGRAM_ID_STRING = "YourProgramId..."
```

## Troubleshooting

### Invalid RPC Endpoint
If you see an error about invalid RPC endpoint:
- Check the URL format is correct
- Ensure the RPC endpoint is accessible
- Try a different RPC provider

### Invalid Program ID
If you see an error about invalid Program ID:
- Verify the Program ID is a valid Solana public key (base58 encoded)
- Check that the program is deployed to the target network
- Ensure the Program ID matches your deployed contract

### Configuration Not Updating
If changes don't take effect:
- Restart the development server (`npm run dev`)
- Clear browser cache
- Check for TypeScript compilation errors

## Need Help?

- Check the browser console for configuration validation messages
- Verify your Program ID is deployed on the target network
- Test RPC connectivity with tools like `solana` CLI
