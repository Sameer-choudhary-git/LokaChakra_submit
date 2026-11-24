// test-info.js
import logger from './src/utils/logStash-logger';

console.log('--- Testing Logger Levels ---');

// 1. Send an Info log
logger.info("This is a MANUAL Info log", { testId: 123 });

// 2. Send an Error log
logger.error("This is a MANUAL Error log", { testId: 456 });

console.log('--- Logs sent. Check Kibana now. ---');