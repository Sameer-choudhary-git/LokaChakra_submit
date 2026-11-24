
const {
  Connection,
  clusterApiUrl,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  TransactionInstruction,
} = require("@solana/web3.js");

// Replace with your actual program ID
const PROGRAM_ID = new PublicKey("8mvZV7aQVZf7EyyvBsKs6SNJtL4uvkeWfbuk86C8P4g4");
const connection = new Connection("http://127.0.0.1:8899");

// Import users.json
const fs = require('fs');
const users = JSON.parse(fs.readFileSync('users.json', 'utf8'));

// Manual serialization functions
function serializeString(str) {
    const stringBytes = Buffer.from(str, 'utf8');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(stringBytes.length, 0);
    return Buffer.concat([lengthBuffer, stringBytes]);
}

function serializeUserRoles(roles) {
    const buffer = Buffer.alloc(10); // 10 boolean fields
    let offset = 0;
    
    // Write each boolean field (1 byte each) - match Rust struct order
    buffer.writeUInt8(roles.founder ? 1 : 0, offset++);
    buffer.writeUInt8(roles.investor ? 1 : 0, offset++);
    buffer.writeUInt8(roles.accelerator ? 1 : 0, offset++);
    buffer.writeUInt8(roles.executive ? 1 : 0, offset++);
    buffer.writeUInt8(roles.legal ? 1 : 0, offset++);
    buffer.writeUInt8(roles.government ? 1 : 0, offset++);
    buffer.writeUInt8(roles.cybersecurity ? 1 : 0, offset++);
    buffer.writeUInt8(roles.freelancer ? 1 : 0, offset++);
    buffer.writeUInt8(roles.mentor_research ? 1 : 0, offset++);
    buffer.writeUInt8(roles.exit_planner ? 1 : 0, offset++);
    
    return buffer;
}

function serializeCreateProfileData(ipfsCid, userRoles) {
    // Based on Rust struct CreateProfileData:
    // pub ipfs_cid: String,
    // pub roles: UserRoles,
    
    console.log("Manual serialization - IPFS CID:", ipfsCid);
    console.log("Manual serialization - User roles:", userRoles);
    
    // Serialize IPFS CID (string) first
    const cidBuffer = serializeString(ipfsCid);
    console.log("CID buffer length:", cidBuffer.length);
    console.log("CID buffer:", cidBuffer);
    
    // Serialize UserRoles (10 booleans)
    const rolesBuffer = serializeUserRoles(userRoles);
    console.log("Roles buffer length:", rolesBuffer.length);
    console.log("Roles buffer:", rolesBuffer);
    
    // Concatenate: ipfs_cid + roles (match Rust struct field order)
    const result = Buffer.concat([cidBuffer, rolesBuffer]);
    console.log("Total serialized length:", result.length);
    console.log("Total serialized data:", result);
    
    return result;
}

function serializeUpdateProfileData(ipfsCid, userRoles) {
    // Same structure as CreateProfileData
    return serializeCreateProfileData(ipfsCid, userRoles);
}

// Function to convert role string to UserRoles object
function createUserRoles(role) {
    const roleProperties = {
        founder: false,
        investor: false,
        accelerator: false,
        executive: false,
        legal: false,
        government: false,
        cybersecurity: false,
        freelancer: false,
        mentor_research: false,
        exit_planner: false
    };
    
    switch(role.toLowerCase()) {
        case 'founder':
        case 'founders':
            roleProperties.founder = true;
            break;
        case 'investor':
        case 'investors':
            roleProperties.investor = true;
            break;
        case 'accelerator':
        case 'accelerators':
            roleProperties.accelerator = true;
            break;
        case 'executive':
        case 'executives':
            roleProperties.executive = true;
            break;
        case 'legal':
            roleProperties.legal = true;
            break;
        case 'government':
            roleProperties.government = true;
            break;
        case 'cybersecurity':
            roleProperties.cybersecurity = true;
            break;
        case 'freelancer':
        case 'freelancers':
            roleProperties.freelancer = true;
            break;
        case 'mentor_research':
        case 'mentors_research':
        case 'mentor':
        case 'research':
            roleProperties.mentor_research = true;
            break;
        case 'exit_planner':
        case 'exit_planners':
        case 'exit':
        case 'planner':
            roleProperties.exit_planner = true;
            break;
        default:
            console.log(`Warning: Unknown role '${role}', defaulting to founder`);
            roleProperties.founder = true;
            break;
    }
    
    return roleProperties;
}

async function getCidFromUser(user) {
    const pinataApiKey = "2488c868234db9bca5ec";
    const pinataSecretApiKey = "3fb8146247782e648d0bd0426fc6ffc22616ebcbfe92c98d710ca7ebed4a4428";
    const pinataUrl = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
    const pinataHeaders = {
        "Content-Type": "application/json",
        "pinata_api_key": pinataApiKey,
        "pinata_secret_api_key": pinataSecretApiKey,
    };
    const pinataBody = {
        user: user,
    };
    try {
        const response = await fetch(pinataUrl, {
            method: "POST",
            headers: pinataHeaders,
            body: JSON.stringify(pinataBody),
        });
        if (!response.ok) {
            throw new Error(`Pinata API error: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Data uploaded to IPFS:", data);
        return data.IpfsHash; // Return the CID
    } catch (error) {
        console.error("Error uploading to Pinata:", error);
        throw error;
    }
}

// Improved airdrop function with better error handling and retry logic
async function requestAirdropWithRetry(publicKey, amount, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`Airdrop attempt ${attempt}/${maxRetries}...`);
        
        try {
            // Quick connection test
            await connection.getSlot();
            
            // Request airdrop
            const signature = await connection.requestAirdrop(publicKey, amount);
            console.log(`Airdrop signature: ${signature}`);
            
            // Wait for confirmation with longer timeout
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');
            
            if (confirmation.value.err) {
                throw new Error(`Airdrop transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }
            
            // Verify balance actually increased
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait a bit more
            const balance = await connection.getBalance(publicKey);
            
            if (balance >= amount * 0.8) { // Allow some tolerance for fees
                console.log(`✅ Airdrop successful! Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
                return balance;
            } else {
                throw new Error(`Balance verification failed. Expected at least ${(amount * 0.8) / LAMPORTS_PER_SOL} SOL, got ${balance / LAMPORTS_PER_SOL} SOL`);
            }
            
        } catch (error) {
            console.log(`❌ Airdrop attempt ${attempt} failed:`, error.message);
            
            if (attempt === maxRetries) {
                throw new Error(`All airdrop attempts failed. Last error: ${error.message}`);
            }
            
            // Progressive backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function uploadDataToBlockchain(cid, keypair, role) {
    try {
        const userRoles = createUserRoles(role);        
        const serializedData = serializeCreateProfileData(cid, userRoles);
        const instructionData = Buffer.concat([
            Buffer.from([0]),
            serializedData
        ]);
        const [profilePDA, profileBump] = await PublicKey.findProgramAddress(
            [Buffer.from("profile"), keypair.publicKey.toBuffer()],
            PROGRAM_ID
        );
        const instruction = new TransactionInstruction({
            keys: [
                {
                    pubkey: keypair.publicKey,
                    isSigner: true,
                    isWritable: true,
                },
                {
                    pubkey: profilePDA,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: SystemProgram.programId,
                    isSigner: false,
                    isWritable: false,
                },
            ],
            programId: PROGRAM_ID,
            data: instructionData,
        });
       
        const transaction = new Transaction().add(instruction);
       
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = keypair.publicKey;

        transaction.sign(keypair);
        const signature = transaction.signature.toString('base64');

        const processingQueueResponse = await sendToProcessingQueue({
            profilePDA: profilePDA.toString(),
            role,
            cid,
            signature: signature.toString(),
            userPublicKey: keypair.publicKey.toString(),
            timestamp: Date.now(),
            status: 'pending_validation'
        });

        if(!processingQueueResponse || !processingQueueResponse.success) {
            throw new Error('Failed to send user data to processing queue');
        }
       
        const confirmedSignature = await connection.sendTransaction(
            transaction,
            [keypair],
            {
                maxRetries: 3,
            }
        );
        
        const confirmation = await connection.confirmTransaction({
            signature: confirmedSignature,
            blockhash: blockhash,
            lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
        }, 'confirmed');
        
        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }
        
        console.log(`Transaction confirmed! Signature: ${confirmedSignature}`);
        console.log(`Profile PDA: ${profilePDA.toString()}`);
       
        console.log(`Profile created successfully! Transaction signature: ${signature}`);
        console.log(`Profile PDA: ${profilePDA.toString()}`);
       
        // Send to RabbitMQ queue for processing
        
       
        return {
            signature,
            profilePDA: profilePDA.toString(),
            role,
            cid
        };
       
    } catch (error) {
        console.error("Error uploading to blockchain:", error);
        throw error;
    }
}

async function sendToProcessingQueue(userData) {
    try {
        const response = await fetch('http://localhost:3000/api/queue/add-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to add user to processing queue');
        }
        
        console.log('User added to processing queue successfully');
        return await response.json();
    } catch (error) {
        console.error('Error adding user to queue:', error);
        throw error;
    }
}


// Function to update profile (manual serialization)
async function updateProfileOnBlockchain(cid, keypair, role, profilePDA) {
    try {
        console.log(`Updating profile for role: ${role}, CID: ${cid}`);
        
        // Create UserRoles object based on the role
        const userRoles = createUserRoles(role);
        console.log(`Created UserRoles for update:`, userRoles);
        
        // Manual serialization for update
        console.log("Using manual serialization for update...");
        const serializedData = serializeUpdateProfileData(cid, userRoles);
        console.log(`Manually serialized update data length: ${serializedData.length}`);
        
        // Create instruction data with discriminator (1 for UpdateProfile)
        const instructionData = Buffer.concat([
            Buffer.from([1]), // Instruction discriminator for UpdateProfile
            serializedData
        ]);
        
        console.log(`Total instruction data length: ${instructionData.length}`);
        
        // Create the instruction
        const instruction = new TransactionInstruction({
            keys: [
                {
                    pubkey: keypair.publicKey,
                    isSigner: true,
                    isWritable: false,
                }, // User account (signer)
                {
                    pubkey: new PublicKey(profilePDA),
                    isSigner: false,
                    isWritable: true,
                }, // Profile account (PDA, will be updated)
            ],
            programId: PROGRAM_ID,
            data: instructionData,
        });
        
        // Create and send transaction
        const transaction = new Transaction().add(instruction);
        
        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = keypair.publicKey;
        
        // Sign and send transaction
        console.log("Sending update transaction...");
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [keypair],
            {
                commitment: 'confirmed',
                maxRetries: 3,
            }
        );
        
        console.log(`Profile updated successfully! Transaction signature: ${signature}`);
        
        return {
            signature,
            profilePDA,
            role,
            cid
        };
        
    } catch (error) {
        console.error("Error updating profile on blockchain:", error);
        throw error;
    }
}

// Function to deactivate profile
async function deactivateProfileOnBlockchain(keypair, profilePDA) {
    try {
        console.log(`Deactivating profile...`);
        
        // Create instruction data with discriminator (2 for DeactivateProfile)
        const instructionData = Buffer.from([2]); // No additional data needed
        
        // Create the instruction
        const instruction = new TransactionInstruction({
            keys: [
                {
                    pubkey: keypair.publicKey,
                    isSigner: true,
                    isWritable: false,
                }, // User account (signer)
                {
                    pubkey: new PublicKey(profilePDA),
                    isSigner: false,
                    isWritable: true,
                }, // Profile account (PDA, will be deactivated)
            ],
            programId: PROGRAM_ID,
            data: instructionData,
        });
        
        // Create and send transaction
        const transaction = new Transaction().add(instruction);
        
        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = keypair.publicKey;
        
        // Sign and send transaction
        console.log("Sending deactivate transaction...");
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [keypair],
            {
                commitment: 'confirmed',
                maxRetries: 3,
            }
        );
        
        console.log(`Profile deactivated successfully! Transaction signature: ${signature}`);
        
        return {
            signature,
            profilePDA
        };
        
    } catch (error) {
        console.error("Error deactivating profile on blockchain:", error);
        throw error;
    }
}

// Function to check validator status
async function checkValidatorStatus() {
    try {
        console.log("🔍 Checking validator status...");
        
        // Check if connection is working
        const version = await connection.getVersion();
        console.log(`✅ Connected to Solana validator version: ${version['solana-core']}`);
        
        // Check slot
        const slot = await connection.getSlot();
        console.log(`✅ Current slot: ${slot}`);
        
        // Check epoch info
        const epochInfo = await connection.getEpochInfo();
        console.log(`✅ Epoch: ${epochInfo.epoch}, Block height: ${epochInfo.blockHeight}`);
        
        // Try a simple balance check to verify connection
        const testKeypair = Keypair.generate();
        const balance = await connection.getBalance(testKeypair.publicKey);
        console.log(`✅ Connection test successful (balance check: ${balance} lamports)`);
        
        return true;
    } catch (error) {
        console.error("❌ Validator status check failed:", error.message);
        console.log("\n💡 Troubleshooting steps:");
        console.log("1. Make sure solana-test-validator is running:");
        console.log("   solana-test-validator --reset");
        console.log("2. Check if port 8899 is accessible");
        console.log("3. Try restarting the validator");
        return false;
    }
}

const main = async () => {
    // Check validator status first
    const validatorOk = await checkValidatorStatus();
    if (!validatorOk) {
        console.error("❌ Cannot proceed without a working validator");
        return;
    }
    
    const results = [];    
    for (const role in users) {
        console.log(`\n🔄 Processing role: ${role}`);
        
        for (let i = 0; i < users[role].length; i++) {
            const user = users[role][i];
            console.log(`\n📝 Processing user ${i + 1} of ${users[role].length} for role ${role}`);
            
            try {
                const keypair = Keypair.generate();
                console.log(`🔑 Generated keypair: ${keypair.publicKey.toString()}`);
                
                // Request airdrop with improved retry logic
                console.log("💰 Requesting airdrop...");
                await requestAirdropWithRetry(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
                
                // Verify final balance
                const finalBalance = await connection.getBalance(keypair.publicKey);
                console.log(`💰 Final balance: ${finalBalance / LAMPORTS_PER_SOL} SOL`);
                
                // Upload to IPFS
                console.log("📤 Uploading to IPFS...");
                const cid = await getCidFromUser(user);
                
                // Upload to blockchain using manual serialization
                console.log("⛓️ Uploading to blockchain with manual serialization...");
                const result = await uploadDataToBlockchain(cid, keypair, role);
                results.push(result);
                
                console.log(`✅ Successfully processed user for role ${role}`);
                
                // Wait between transactions to avoid overwhelming the validator
                await new Promise(resolve => setTimeout(resolve, 3000)); 
                
            } catch (error) {
                console.error(`❌ Failed to process user for role ${role}:`, error.message);
                console.error("Stack trace:", error.stack);
                
                // Continue with next user instead of stopping
                continue;
            }
        }
    }
    
    console.log("\n📊 Summary of all transactions:");
    results.forEach((result, index) => {
        console.log(`${index + 1}. Role: ${result.role}, PDA: ${result.profilePDA}, TX: ${result.signature}`);
    });
    
    console.log(`\nTotal successful transactions: ${results.length}`);
};

// Export functions for use in other modules
module.exports = {
    uploadDataToBlockchain,
    updateProfileOnBlockchain,
    deactivateProfileOnBlockchain,
    createUserRoles,
    serializeCreateProfileData,
    serializeUpdateProfileData,
    main
};

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}