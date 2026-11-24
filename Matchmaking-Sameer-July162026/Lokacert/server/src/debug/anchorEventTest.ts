import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import idlJson from '../anchor_files/onchain_certification.json';

export async function testDirectAnchorEvents(connection: Connection) {
  console.log('\n🔍 TESTING DIRECT ANCHOR EVENTS...\n');

  try {
    // Create minimal provider
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: PublicKey.default,
        signTransaction: async (tx: Transaction) => tx,
        signAllTransactions: async (txs: Transaction[]) => txs,
      } as any,
      { commitment: 'confirmed' }
    );

    // Create program instance
    const program = new Program(idlJson as Idl, provider);

    console.log('✅ Program instance created');
    console.log('📋 Program ID:', program.programId.toBase58());

    // Test each event type individually
    const eventNames = [
      'CompanyInitialized',
      'CertificateIssued',
      'EmployeeAdded',
      'AwardMinted',
    ];

    const results = [];

    for (const eventName of eventNames) {
      try {
        console.log(`\n🎧 Testing ${eventName} event listener...`);

        const listenerId = program.addEventListener(
          eventName,
          (event, slot, signature) => {
            console.log(`🎉 ANCHOR EVENT RECEIVED: ${eventName}`);
            console.log('📊 Event Data:', JSON.stringify(event, null, 2));
            console.log('🎯 Slot:', slot);
            console.log('✍️  Signature:', signature?.substring(0, 16) + '...');
          }
        );

        console.log(`✅ ${eventName} listener registered (ID: ${listenerId})`);
        results.push({ event: eventName, status: 'registered', listenerId });

        // Remove listener after 2 seconds
        setTimeout(async () => {
          try {
            await program.removeEventListener(listenerId);
            console.log(`🧹 Removed ${eventName} listener`);
          } catch (error) {
            console.log(`⚠️ Failed to remove ${eventName} listener:`, error);
          }
        }, 2000);
      } catch (error) {
        console.error(`❌ Failed to register ${eventName}:`, error);
        results.push({
          event: eventName,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: true,
      program: {
        programId: program.programId.toBase58(),
        provider: provider.connection.rpcEndpoint,
      },
      results,
    };
  } catch (error) {
    console.error('❌ Direct Anchor event test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function inspectProgramLogs(
  connection: Connection,
  signature: string
) {
  console.log(
    `\n🔍 INSPECTING TRANSACTION: ${signature.substring(0, 16)}...\n`
  );

  try {
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction) {
      console.log('❌ Transaction not found');
      return;
    }

    console.log('📋 Transaction Details:');
    console.log('- Slot:', transaction.slot);
    console.log(
      '- Block Time:',
      transaction.blockTime
        ? new Date(transaction.blockTime * 1000).toISOString()
        : 'N/A'
    );
    console.log('- Status:', transaction.meta?.err ? 'FAILED' : 'SUCCESS');

    if (transaction.meta?.logMessages) {
      console.log('\n📜 All Log Messages:');
      transaction.meta.logMessages.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log}`);
      });

      // Look for event patterns
      const eventLogs = transaction.meta.logMessages.filter(
        (log) =>
          log.includes('Program data:') ||
          log.includes('Program log:') ||
          log.toLowerCase().includes('event')
      );

      if (eventLogs.length > 0) {
        console.log('\n🎯 Potential Event Logs:');
        eventLogs.forEach((log, index) => {
          console.log(`  ${index + 1}. ${log}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Failed to inspect transaction:', error);
  }
}
