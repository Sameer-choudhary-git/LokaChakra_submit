import Arweave from 'arweave';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { TimeoutOperations } from './timeout-wrapper';

const AR_CONFIG = {
  local: {
    host: 'localhost',
    port: 1984,
    protocol: 'http',
  },
  main: {
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
  },
};

// Determine which config to use based on NODE_ENV
const isProduction = process.env.NODE_ENV === 'production';
const activeConfig = isProduction ? AR_CONFIG.main : AR_CONFIG.local;

const arweave = Arweave.init(activeConfig);

/**
 * Get the Arweave gateway URL based on NODE_ENV
 * - development: http://localhost:1984
 * - production: https://arweave.net
 */
export function getArweaveGatewayUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    return 'https://arweave.net';
  }
  return `http://${AR_CONFIG.local.host}:${AR_CONFIG.local.port}`;
}

const WALLET_PATH = path.join(process.cwd(), 'arweave-local-wallet.json');

async function getLocalWallet() {
  if (fs.existsSync(WALLET_PATH)) {
    return JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'));
  }

  const wallet = await arweave.wallets.generate();
  fs.writeFileSync(WALLET_PATH, JSON.stringify(wallet, null, 2));
  console.log(
    '🆕 New wallet generated:',
    await arweave.wallets.jwkToAddress(wallet)
  );
  return wallet;
}

async function fundLocalWallet(address: string, amountAR = 100) {
  try {
    const winstonAmount = (
      BigInt(amountAR) * BigInt(5_000_000_000_000)
    ).toString();
    const mintUrl = `http://${AR_CONFIG.local.host}:${AR_CONFIG.local.port}/mint/${address}/${winstonAmount}`;
    const res = await axios.get(mintUrl);
    console.log(
      `✅ Funded ${amountAR} AR to ${address}. Status: ${res.status}`
    );
  } catch (err) {
    console.error('❌ Funding failed:', err);
  }
}

export async function uploadToArweave(data: string) {
  return TimeoutOperations.arweave.upload(
    (async () => {
      const wallet = await getLocalWallet();
      const address = await arweave.wallets.jwkToAddress(wallet);

      await fundLocalWallet(address);
      const balance = await arweave.wallets.getBalance(address);
      console.log(`💰 Wallet balance: ${balance} winston`);

      const transaction = await arweave.createTransaction({ data }, wallet);
      transaction.addTag('Content-Type', 'application/json');
      transaction.addTag('App-Name', 'lokacert');

      await arweave.transactions.sign(transaction, wallet);
      const response = await arweave.transactions.post(transaction);

      if (response.status === 200) {
        console.log('✅ Uploaded successfully!');
        console.log('Transaction ID:', transaction.id);
        console.log(
          'Arweave URL:',
          `http://${AR_CONFIG.local.host}:${AR_CONFIG.local.port}/${transaction.id}`
        );
        return transaction.id;
      } else {
        throw new Error(`Transaction failed with status ${response.status}`);
      }
    })(),
    'uploadData',
    { dataSize: data.length }
  );
}

/**
 * Get MIME type based on file extension
 */
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Upload image to Arweave
 * @param imageData - Buffer containing the image data
 * @param filename - Original filename to determine MIME type
 * @param customTags - Optional additional tags to add to the transaction
 * @returns Promise<string> - Transaction ID of the uploaded image
 */
export async function uploadImageToArweave(
  imageData: Buffer,
  filename: string,
  customTags?: { [key: string]: string }
): Promise<string> {
  // Validate input
  if (!Buffer.isBuffer(imageData)) {
    throw new Error('Image data must be a Buffer');
  }

  if (!filename) {
    throw new Error('Filename is required to determine MIME type');
  }

  return TimeoutOperations.arweave.upload(
    (async () => {
      const wallet = await getLocalWallet();
      const address = await arweave.wallets.jwkToAddress(wallet);

      // Fund wallet for local development
      if (!isProduction) {
        await fundLocalWallet(address);
      }

      const balance = await arweave.wallets.getBalance(address);
      console.log(`💰 Wallet balance: ${balance} winston`);

      // Create transaction with image buffer
      const transaction = await arweave.createTransaction(
        {
          data: imageData,
        },
        wallet
      );

      // Determine and set content type
      const mimeType = getMimeType(filename);
      transaction.addTag('Content-Type', mimeType);
      transaction.addTag('App-Name', 'lokacert');
      transaction.addTag('File-Name', filename);
      transaction.addTag('Data-Type', 'image');

      // Add custom tags if provided
      if (customTags) {
        Object.entries(customTags).forEach(([key, value]) => {
          transaction.addTag(key, value);
        });
      }

      // Sign and post transaction
      await arweave.transactions.sign(transaction, wallet);
      const response = await arweave.transactions.post(transaction);

      if (response.status === 200) {
        console.log('✅ Image uploaded successfully to Arweave!');
        console.log('Transaction ID:', transaction.id);
        console.log('Image URL:', `${getArweaveGatewayUrl()}/${transaction.id}`);
        console.log('File Type:', mimeType);
        console.log('File Size:', `${imageData.length} bytes`);

        return transaction.id;
      } else {
        throw new Error(`Image upload failed with status ${response.status}`);
      }
    })(),
    'uploadImage',
    { filename, fileSize: imageData.length }
  );
}

export async function fetchArweaveData(txId: string): Promise<any> {
  return TimeoutOperations.arweave.fetch(
    (async () => {
      const url = `${getArweaveGatewayUrl()}/${txId}`;
      const response = await axios.get(url);
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(
          `Failed to fetch data from Arweave. Status: ${response.status}`
        );
      }
    })(),
    'fetchData',
    { txId, url: `${getArweaveGatewayUrl()}/${txId}` }
  );
}

/**
 * Upload image from file path to Arweave
 * @param filePath - Path to the image file
 * @param customTags - Optional additional tags to add to the transaction
 * @returns Promise<string> - Transaction ID of the uploaded image
 */
export async function uploadImageFromPath(
  filePath: string,
  customTags?: { [key: string]: string }
): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const imageBuffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);

  return uploadImageToArweave(imageBuffer, filename, customTags);
}

/**
 * Upload base64 encoded image to Arweave
 * @param base64Data - Base64 encoded image data (with or without data URL prefix)
 * @param filename - Original filename to determine MIME type
 * @param customTags - Optional additional tags to add to the transaction
 * @returns Promise<string> - Transaction ID of the uploaded image
 */
export async function uploadBase64ImageToArweave(
  base64Data: string,
  filename: string,
  customTags?: { [key: string]: string }
): Promise<string> {
  // Remove data URL prefix if present (e.g., "data:image/png;base64,")
  const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

  // Convert base64 to Buffer
  const imageBuffer = Buffer.from(base64String, 'base64');

  return uploadImageToArweave(imageBuffer, filename, customTags);
}
