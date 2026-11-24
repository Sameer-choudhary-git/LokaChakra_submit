<!-- 
CLEANUP STATUS (Updated: 2026-01-02):

✅ COMPLETED:
- Removed redundant auth.controller.ts (not used in routes)
- Removed toRemove folder with old errorLogger.ts and authMiddleware.ts
- Fixed Logstash connection stability (improved error handling and reconnection logic)
- Fixed bigint warnings by running npm prune to remove extraneous packages

📝 REMAINING (Optional):
- server>src>types files may have some redundancy but are partially used
- Some type files (company.types.ts, employee.types.ts) appear unused but kept for potential future use

🔧 IMPROVEMENTS MADE:
- Enhanced Logstash transport with exponential backoff retry logic
- Added connection timeout handling
- Better error messages for connection issues
- Proper cleanup of socket connections
-->







<!-- timeout logger check -->
<!-- if timeout, retry of left it -->
<!-- solana txn priority --> **

