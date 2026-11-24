// Solana Transaction Confirmer - Enhanced Node.js Tool
// Install dependencies: npm install @solana/web3.js bs58 readline-sync

const {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');
const { decode } = require('bs58');
const { question } = require('readline-sync');
const { existsSync, readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} = require('crypto');

// Configuration
const CONFIG = {
  RPC_ENDPOINT: 'https://api.devnet.solana.com', // Change to your Solana RPC endpoint
  ACCOUNTS_FILE: join(__dirname, 'solana-accounts.json'),
  ENCRYPTION_KEY: 'your-secret-key-change-this', // Change this for production!
};

class AccountManager {
  constructor() {
    this.accounts = [];
    this.loadAccounts();
  }

  // Encrypt private key
  encrypt(text) {
    const key = createHash('sha256').update(CONFIG.ENCRYPTION_KEY).digest();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  // Decrypt private key
  decrypt(text) {
    const key = createHash('sha256').update(CONFIG.ENCRYPTION_KEY).digest();
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Load accounts from file
  loadAccounts() {
    try {
      if (existsSync(CONFIG.ACCOUNTS_FILE)) {
        const data = readFileSync(CONFIG.ACCOUNTS_FILE, 'utf-8');
        this.accounts = JSON.parse(data);
        console.log(`✅ Loaded ${this.accounts.length} saved accounts\n`);
      } else {
        console.log('ℹ️  No saved accounts found. You can add new accounts.\n');
      }
    } catch (error) {
      console.error('⚠️  Error loading accounts:', error.message);
      this.accounts = [];
    }
  }

  // Save accounts to file
  saveAccounts() {
    try {
      writeFileSync(
        CONFIG.ACCOUNTS_FILE,
        JSON.stringify(this.accounts, null, 2)
      );
      console.log('✅ Accounts saved successfully\n');
    } catch (error) {
      console.error('❌ Error saving accounts:', error.message);
    }
  }

  // Add new account
  addAccount() {
    console.log('\n➕ Add New Account\n');
    console.log('Select method to add account:\n');
    console.log('1. From keypair file');
    console.log('2. From base58 private key');
    console.log('3. From secret array\n');

    const method = question('Select method (1-3): ');

    let keypair;
    try {
      switch (method) {
        case '1':
          keypair = this.loadFromFile();
          break;
        case '2':
          keypair = this.loadFromPrivateKey();
          break;
        case '3':
          keypair = this.loadFromSecretArray();
          break;
        default:
          console.log('❌ Invalid method');
          return false;
      }

      if (!keypair) {
        return false;
      }

      // Get account name
      const name = question('\nEnter a name for this account: ');

      if (!name || name.trim() === '') {
        console.log('❌ Account name cannot be empty');
        return false;
      }

      // Check if name already exists
      if (this.accounts.find((acc) => acc.name === name)) {
        console.log('❌ Account with this name already exists');
        return false;
      }

      // Save account
      const publicKey = keypair.publicKey.toString();
      const privateKeyBytes = keypair.secretKey;
      const privateKey = Buffer.from(privateKeyBytes).toString('base64');
      const encryptedPrivateKey = this.encrypt(privateKey);

      this.accounts.push({
        name: name,
        publicKey: publicKey,
        privateKey: encryptedPrivateKey,
        addedAt: new Date().toISOString(),
      });

      this.saveAccounts();
      console.log(`\n✅ Account "${name}" added successfully!`);
      console.log(`📍 Public Key: ${publicKey}\n`);

      return true;
    } catch (error) {
      console.error(`❌ Error adding account: ${error.message}`);
      return false;
    }
  }

  // Load from keypair file
  loadFromFile() {
    const filepath = question('Enter path to keypair file: ');

    try {
      const keypairData = JSON.parse(readFileSync(filepath, 'utf-8'));
      return Keypair.fromSecretKey(Uint8Array.from(keypairData));
    } catch (error) {
      console.error(`❌ Error loading keypair: ${error.message}`);
      return null;
    }
  }

  // Load from base58 private key
  loadFromPrivateKey() {
    const privateKey = question('Enter base58 private key: ', {
      hideEchoBack: true,
    });

    try {
      const secretKey = decode(privateKey);
      return Keypair.fromSecretKey(secretKey);
    } catch (error) {
      console.error(`❌ Error loading keypair: ${error.message}`);
      return null;
    }
  }

  // Load from secret array
  loadFromSecretArray() {
    console.log('Enter secret key array (paste the entire array):');
    const secretArray = question('');

    try {
      const parsed = JSON.parse(secretArray);
      return Keypair.fromSecretKey(Uint8Array.from(parsed));
    } catch (error) {
      console.error(`❌ Error loading keypair: ${error.message}`);
      return null;
    }
  }

  // List all accounts
  listAccounts() {
    if (this.accounts.length === 0) {
      console.log('\nℹ️  No accounts saved yet.\n');
      return;
    }

    console.log('\n📋 Saved Accounts:\n');
    this.accounts.forEach((acc, index) => {
      console.log(`${index + 1}. ${acc.name}`);
      console.log(`   Public Key: ${acc.publicKey}`);
      console.log(`   Added: ${new Date(acc.addedAt).toLocaleString()}\n`);
    });
  }

  // Select account
  selectAccount() {
    if (this.accounts.length === 0) {
      console.log('\n❌ No accounts available. Please add an account first.\n');
      return null;
    }

    console.log('\n🔑 Select Account:\n');
    this.accounts.forEach((acc, index) => {
      console.log(
        `${index + 1}. ${acc.name} (${acc.publicKey.slice(0, 8)}...${acc.publicKey.slice(-8)})`
      );
    });

    const choice = question(
      '\nSelect account (1-' + this.accounts.length + '): '
    );
    const index = parseInt(choice) - 1;

    if (index < 0 || index >= this.accounts.length) {
      console.log('❌ Invalid selection');
      return null;
    }

    const account = this.accounts[index];
    const privateKey = this.decrypt(account.privateKey);
    const secretKey = Buffer.from(privateKey, 'base64');
    const keypair = Keypair.fromSecretKey(secretKey);

    console.log(`\n✅ Selected: ${account.name}`);
    console.log(`📍 Public Key: ${account.publicKey}\n`);

    return keypair;
  }

  // Delete account
  deleteAccount() {
    if (this.accounts.length === 0) {
      console.log('\n❌ No accounts to delete.\n');
      return;
    }

    this.listAccounts();
    const choice = question(
      'Select account to delete (1-' +
        this.accounts.length +
        ') or 0 to cancel: '
    );
    const index = parseInt(choice) - 1;

    if (choice === '0') {
      console.log('❌ Cancelled\n');
      return;
    }

    if (index < 0 || index >= this.accounts.length) {
      console.log('❌ Invalid selection');
      return;
    }

    const account = this.accounts[index];
    const confirm = question(
      `⚠️  Delete "${account.name}"? This cannot be undone! (yes/no): `
    );

    if (confirm.toLowerCase() === 'yes') {
      this.accounts.splice(index, 1);
      this.saveAccounts();
      console.log(`✅ Account deleted successfully\n`);
    } else {
      console.log('❌ Cancelled\n');
    }
  }
}

class SolanaTransactionConfirmer {
  constructor() {
    this.connection = new Connection(CONFIG.RPC_ENDPOINT, 'confirmed');
    this.accountManager = new AccountManager();
  }

  async confirmTransaction(serializedTx, keypair) {
    console.log('\n🔄 Processing transaction...\n');

    try {
      const txBuffer = Buffer.from(serializedTx, 'base64');
      const transaction = Transaction.from(txBuffer);

      console.log('📋 Transaction Details:');
      console.log(`   Instructions: ${transaction.instructions.length}`);
      console.log(
        `   Recent Blockhash: ${transaction.recentBlockhash || 'Not set'}`
      );
      console.log(
        `   Fee Payer: ${transaction.feePayer?.toString() || 'Not set'}\n`
      );

      if (!transaction.recentBlockhash) {
        console.log('⚠️  Fetching recent blockhash...');
        const { blockhash } = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
      }

      if (!transaction.feePayer) {
        transaction.feePayer = keypair.publicKey;
      }

      const balance = await this.connection.getBalance(keypair.publicKey);
      console.log(`💰 Account Balance: ${balance / 1e9} SOL`);

      const confirm = question(
        '\n❓ Sign and send this transaction? (yes/no): '
      );

      if (confirm.toLowerCase() !== 'yes') {
        console.log('❌ Transaction cancelled\n');
        return null;
      }

      transaction.sign(keypair);
      console.log('\n✍️  Transaction signed');

      console.log('📤 Sending transaction...');
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keypair],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
        }
      );

      console.log('\n✅ Transaction Confirmed! 🎉\n');
      console.log(`📝 Signature: ${signature}`);
      console.log(`🔍 Explorer: https://explorer.solana.com/tx/${signature}\n`);

      return signature;
    } catch (error) {
      console.error(`\n❌ Transaction failed: ${error.message}\n`);
      throw error;
    }
  }

  async showMenu() {
    console.clear();
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   Solana Transaction Confirmer v2.0      ║');
    console.log('║      Enhanced Development Tool           ║');
    console.log('╚══════════════════════════════════════════╝\n');

    while (true) {
      console.log('📱 Main Menu:\n');
      console.log('1. Confirm Transaction');
      console.log('2. Add New Account');
      console.log('3. List Accounts');
      console.log('4. Delete Account');
      console.log('5. Exit\n');

      const choice = question('Select option (1-5): ');

      switch (choice) {
        case '1':
          await this.handleConfirmTransaction();
          break;
        case '2':
          this.accountManager.addAccount();
          break;
        case '3':
          this.accountManager.listAccounts();
          break;
        case '4':
          this.accountManager.deleteAccount();
          break;
        case '5':
          console.log('\n👋 Goodbye!\n');
          process.exit(0);
          break;
        default:
          console.log('❌ Invalid option\n');
      }

      question('\nPress Enter to continue...');
      console.clear();
      console.log('╔══════════════════════════════════════════╗');
      console.log('║   Solana Transaction Confirmer v2.0      ║');
      console.log('╚══════════════════════════════════════════╝\n');
    }
  }

  async handleConfirmTransaction() {
    const keypair = this.accountManager.selectAccount();

    if (!keypair) {
      return;
    }

    console.log('📋 Paste your serialized transaction (base64):');
    const txData = question('');

    if (!txData || txData.trim() === '') {
      console.log('\n❌ No transaction data provided\n');
      return;
    }

    try {
      await this.confirmTransaction(txData.trim(), keypair);

      const finalBalance = await this.connection.getBalance(keypair.publicKey);
      console.log(`💰 Final Balance: ${finalBalance / 1e9} SOL\n`);
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

// Main execution
async function main() {
  const confirmer = new SolanaTransactionConfirmer();
  await confirmer.showMenu();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SolanaTransactionConfirmer, AccountManager };
