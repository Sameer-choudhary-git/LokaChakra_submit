const { Connection, PublicKey } = require('@solana/web3.js');

// Quick debug script to check what's happening with the verification
async function debugVerification() {
  const connection = new Connection('https://solana-devnet.api.syndica.io/api-key/Ls7o2viMiJpJzu1AiLJhCSqhDiTdm8DtnYFxMkzwHD6ShF3M9XKtwD8uYMXab58P5GCL1nsNGUiD2pLRwg1wwuG2ZfEdyRR3qZ');
  
  const certificatePubkey = new PublicKey('BJxvAiAiuRE6E18pd4CNrfCCMDUpzyfjndSb1UVE2vQT');
  const companyPubkey = new PublicKey('9yqKbeBKCTZ7iQxpEePqiF2qP9avgs6NGBjQukUyJ7aQ');
  const employeePubkey = new PublicKey('3trXoKSSxP5JHSg2zh3JjVhP7uEKWQc1bjEg4CwsKxk6');
  const programId = new PublicKey('78g8P6uz4Y9aZ899YfZUNzk5q7WLvxcbUBSQ8Eucgh2X');
  
  console.log('🔍 DEBUG: Testing direct account lookups...');
  
  try {
    // Test certificate account
    const certAccount = await connection.getAccountInfo(certificatePubkey);
    console.log('Certificate account exists:', !!certAccount);
    if (certAccount) {
      console.log('Certificate account owner:', certAccount.owner.toBase58());
      console.log('Certificate account data length:', certAccount.data.length);
    }
    
    // Test company account
    const companyAccount = await connection.getAccountInfo(companyPubkey);
    console.log('Company account exists:', !!companyAccount);
    if (companyAccount) {
      console.log('Company account owner:', companyAccount.owner.toBase58());
      console.log('Company account data length:', companyAccount.data.length);
    } else {
      console.log('💡 Company account not found at direct address, might be a PDA derivation issue');
    }
    
    // Test employee account  
    const employeeAccount = await connection.getAccountInfo(employeePubkey);
    console.log('Employee account exists:', !!employeeAccount);
    if (employeeAccount) {
      console.log('Employee account owner:', employeeAccount.owner.toBase58());
      console.log('Employee account data length:', employeeAccount.data.length);
    } else {
      console.log('💡 Employee account not found at direct address, might be a PDA derivation issue');
    }
    
    // Check if these might be wallet addresses by looking for actual employee PDAs
    console.log('\n🔍 DEBUG: Searching for actual employee accounts...');
    
    try {
      const employeeAccounts = await connection.getProgramAccounts(programId, {
        filters: [
          { dataSize: 123 }, // Employee size based on contract
          {
            memcmp: {
              offset: 8, // Skip discriminator  
              bytes: employeePubkey.toBase58(), // Look for this as wallet field
            },
          },
        ],
      });
      
      console.log('Found employee accounts with this wallet:', employeeAccounts.length);
      employeeAccounts.forEach((acc, i) => {
        console.log(`Employee PDA ${i + 1}: ${acc.pubkey.toBase58()}`);
      });
    } catch (searchError) {
      console.log('Error searching for employee accounts:', searchError.message);
    }
    
    console.log('✅ DEBUG: Account lookup test completed');
    
  } catch (error) {
    console.error('❌ DEBUG: Error during account lookup:', error.message);
  }
}

debugVerification().catch(console.error);
