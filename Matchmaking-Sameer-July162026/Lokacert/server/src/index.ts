import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { Connection, PublicKey } from '@solana/web3.js';
import { Idl } from '@coral-xyz/anchor';
// Custom Imports
import { 
  globalErrorHandler, 
  notFoundHandler, 
} from './middleware/globalErrorHandler';
import logger from "../src/utils/logStash-logger";
import { ApiError } from './types/error.types';
import { createCertificationSDK } from './sdk';
import idlJson from './anchor_files/onchain_certification.json';
import { requestLogger } from './middleware/requestLogger';
import { LogMonitor } from './monitoring/logMonitor';
import { prisma } from './lib/prisma';
import router from './routes/route.index';
// =================================================================
// 🛡️ 1. SAFETY NET (Synchronous Errors)
// =================================================================
// Must be placed immediately to catch bugs in the rest of the file
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(`${err.name}: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

logger.info('Starting the certification SDK server...');

// =================================================================
// ⚙️ 2. APP & RESOURCE INITIALIZATION
// =================================================================
const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

// Global variables for cleanup access
let server: http.Server | null = null;
let logMonitor: LogMonitor | null = null;

// Initialize Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'http://localhost:8899',
  { commitment: 'confirmed' }
);
logger.info(`📡 RPC Connection established: ${connection.rpcEndpoint}`);

// Initialize SDK
const programId = new PublicKey(idlJson.address);
export const sdk = createCertificationSDK(connection, idlJson as Idl);
sdk.initializeWithIdl(idlJson as Idl);

// Initialize Log Monitor (Backup Event Detection)
try {
  logMonitor = new LogMonitor(connection, idlJson.address as string);
  logMonitor.startLogMonitoring();
  logger.info('📜 Log monitoring service started.');
} catch (error) {
  logger.error('❌ Failed to start log monitor:', error);
}

// =================================================================
// 🔌 3. MIDDLEWARE
// =================================================================
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(requestLogger); // Log incoming requests

// =================================================================
// 🛣️ 4. ROUTES
// =================================================================
app.use('/api', router);

app.get('/crash', (req, res) => {
  // Simulate a crash
  throw new Error("This is a test crash for Logstash!");
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    programId: programId.toBase58(),
    rpc: connection.rpcEndpoint,
    monitoring: logMonitor?.getStatus()
  });
});

app.get('/', (req, res) => {
  logger.info("Someone hit the home route!"); // Sends "Info" log
  res.send('Hello World');
});


// =================================================================
// 🛑 5. SHUTDOWN & CLEANUP LOGIC
// =================================================================
const cleanup = async (exitCode: number = 0) => {
  console.log('\n🛑 Starting graceful shutdown...');

  // 1. Close HTTP Server
  if (server) {
    server.close(() => console.log('✅ HTTP server closed.'));
  }

  // 2. Stop Log Monitor (CRITICAL: Prevents Ghost Subscriptions)
  if (logMonitor) {
    await logMonitor.stop();
    console.log('✅ Solana Log Monitor stopped.');
  }

  // 3. Disconnect Database
  try {
    await prisma.$disconnect();
    console.log('✅ Prisma database disconnected.');
  } catch (e) {
    console.error('⚠️ Error disconnecting Prisma:', e);
  }

  console.log('👋 Cleanup complete. Exiting.');
  process.exit(exitCode);
};


// Handle 404s
app.use(notFoundHandler);

// Handle Errors (Must be last)
app.use(globalErrorHandler);
// =================================================================
// 🚀 6. START SERVER
// =================================================================
try {
  server = app.listen(PORT, () => {
    logger.info("RPC = " + connection.rpcEndpoint);
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📋 Program ID: ${programId.toBase58()}`);
  });

  server.on('error', (error) => {
    logger.error('❌ Server failed to start:', error);
    process.exit(1);
  });
} catch (error) {
  logger.error('❌ Critical failure during startup:', error);
  process.exit(1);
}

// =================================================================
// 👂 7. SIGNAL LISTENERS
// =================================================================

// Async Errors (Promises) - Reuse cleanup logic but exit with error code 1
process.on('unhandledRejection', async (err: Error) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(`${err.name}: ${err.message}`);
  await cleanup(1);
});

// Manual Termination (Ctrl+C)
process.on('SIGINT', () => cleanup(0));

// Docker/Cloud Termination
process.on('SIGTERM', () => cleanup(0));

// Nodemon Restart
process.once('SIGUSR2', async () => {
  await cleanup(0);
});

export { app, connection };
