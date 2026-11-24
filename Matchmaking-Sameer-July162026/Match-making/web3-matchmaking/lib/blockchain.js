import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
const PROGRAM_ID = new PublicKey("DdFexgvdu3uRGjgwBLXnLFzUVK1Vsjxyz473AovCfwcv"); 
import { Connection } from "@solana/web3.js";


let _connection;
function getConnection() {
  if (!_connection) {
    _connection = new Connection("https://api.devnet.solana.com", "confirmed");
  }
  return _connection;
}
const connection = new getConnection("https://api.devnet.solana.com", "confirmed");
import { getUserDataFromHash } from "./ipfs-read";
export async function uploadDataToBlockchain(cid, wallet, role) {
    try {
        if (!wallet.connected || !wallet.publicKey) {
            throw new Error('Wallet not connected');
        }

        const userRoles = createUserRoles(role);
        const serializedData = serializeCreateProfileData(cid, userRoles);
        const instructionData = Buffer.concat([
            Buffer.from([0]),
            serializedData
        ]);

        const [profilePDA, profileBump] = await PublicKey.findProgramAddress(
            [Buffer.from("profile"), wallet.publicKey.toBuffer()],
            PROGRAM_ID
        );

        // Check if profile already exists before attempting transaction
        try {
            const existingAccount = await connection.getAccountInfo(profilePDA);
            if (existingAccount && !existingAccount.data.every(byte => byte === 0)) {
                throw new Error('PROFILE_ALREADY_EXISTS');
            }
        } catch (error) {
            if (error.message === 'PROFILE_ALREADY_EXISTS') {
                throw error;
            }
            // If it's just a network error checking account, continue with transaction
        }

        const instruction = new TransactionInstruction({
            keys: [
                {
                    pubkey: wallet.publicKey,
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
        transaction.feePayer = wallet.publicKey;

        // Fetch blockhash as late as possible, right before signing/sending,
        // and keep blockhash + lastValidBlockHeight paired together.
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;

        // Sign and send FIRST — do not touch the processing queue until we know
        // whether the transaction actually landed on-chain.
        const simulation = await connection.simulateTransaction(transaction);

console.log(simulation.value.logs);
console.log(simulation.value.err);
        const signature = await wallet.sendTransaction(transaction, connection, {
            maxRetries: 3,
        });

        console.log(`Transaction sent! Signature: ${signature}`);
        console.log(`Profile PDA: ${profilePDA.toString()}`);

        // Confirm using the SAME blockhash/lastValidBlockHeight pair used to build the tx
        let confirmation;
        try {
            confirmation = await connection.confirmTransaction(
                { signature, blockhash, lastValidBlockHeight },
                'confirmed'
            );
        } catch (err) {
            // Expiry means our polling gave up, not necessarily that the tx failed.
            // Double-check via signature status before treating it as a hard failure.
            if (err.name === 'TransactionExpiredBlockheightExceededError') {
                console.warn('Confirmation polling expired, checking signature status directly...');
                const status = await connection.getSignatureStatus(signature, {
                    searchTransactionHistory: true,
                });
                const confStatus = status?.value?.confirmationStatus;
                if (confStatus === 'confirmed' || confStatus === 'finalized') {
                    confirmation = { value: { err: status.value.err } };
                } else {
                    throw err;
                }
            } else {
                throw err;
            }
        }

        if (confirmation.value.err) {
            const errorString = JSON.stringify(confirmation.value.err);
            if (errorString.includes('already in use') || errorString.includes('AccountAlreadyExists')) {
                throw new Error('PROFILE_ALREADY_EXISTS');
            }
            throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }

        console.log(`Transaction confirmed! Signature: ${signature}`);
        console.log(`Profile created successfully!`);

        // Only queue for validation AFTER on-chain confirmation succeeds,
        // and with the real signature (not a placeholder).
        const processingQueueResponse = await sendToProcessingQueue({
            profilePDA: profilePDA.toString(),
            role,
            cid,
            signature,
            userPublicKey: wallet.publicKey.toString(),
            timestamp: Date.now(),
            status: 'pending_validation'
        });

        if (!processingQueueResponse || !processingQueueResponse.success) {
            // The chain write succeeded even though queueing failed here —
            // don't throw a misleading blockchain error for a queueing problem.
            console.error(
                'Transaction confirmed on-chain but failed to queue for validation:',
                processingQueueResponse
            );
        }

        return {
            signature,
            profilePDA: profilePDA.toString(),
            role,
            cid
        };

    } catch (error) {
        console.error("Error uploading to blockchain:", error);

        if (error.message === 'PROFILE_ALREADY_EXISTS') {
            throw new Error('PROFILE_ALREADY_EXISTS');
        } else if (error.message.includes('User rejected')) {
            throw new Error('TRANSACTION_REJECTED');
        } else if (error.message.includes('insufficient funds')) {
            throw new Error('INSUFFICIENT_FUNDS');
        } else if (error.message.includes('Wallet not connected')) {
            throw new Error('WALLET_NOT_CONNECTED');
        }

        throw error;
    }
}

async function sendToProcessingQueue(userData) {
    try {
        // Call the secure, server-side proxy endpoint
        const response = await fetch('/api/queue-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add user to processing queue');
        }

        console.log('User added to processing queue successfully via secure endpoint');
        return await response.json();
    } catch (error) {
        console.error('Error adding user to queue via proxy:', error);
        throw error;
    }
}


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

function serializeString(str) {
    const stringBytes = Buffer.from(str, 'utf8');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(stringBytes.length, 0);
    return Buffer.concat([lengthBuffer, stringBytes]);
}

function serializeUserRoles(roles) {
    const buffer = Buffer.alloc(10);
    let offset = 0;
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


function deserializeString(buffer, offset) {
    const length = buffer.readUInt32LE(offset);
    const stringBytes = buffer.slice(offset + 4, offset + 4 + length);
    const value = stringBytes.toString('utf8');
    
    return {
        value: value,
        nextOffset: offset + 4 + length
    };
}

function extractIpfsFromProfile(buffer) {
    let offset = 0;
    
    try {
        // Skip through the struct to get to IPFS CID at the end
        // Authority (32 bytes)
        offset += 32;
        
        // is_active (1 byte)
        offset += 1;
        
        // created_at (8 bytes)
        offset += 8;
        
        // updated_at (8 bytes)  
        offset += 8;
        
        // Skip all 10 role flags (10 bytes)
        offset += 10;
        
        // Now we're at the IPFS CID string
        const ipfsCid = deserializeString(buffer, offset);
        
        return ipfsCid.value;
        
    } catch (error) {
        console.error("IPFS extraction error:", error);
        throw error;
    }
}

export const getUserDataFromBlockchain = async (publicKey) => {
    try {
        const [profilePDA] = await PublicKey.findProgramAddress(
            [Buffer.from("profile"), new PublicKey(publicKey).toBuffer()],
            PROGRAM_ID
        );
        const response = await connection.getAccountInfo(profilePDA);
        if (!response) {
            throw new Error(`No profile found for public key: ${publicKey}`);
        }
        const profileData = response.data;
        const ipfsCid = extractIpfsFromProfile(profileData);
        console.log("Extracted IPFS CID:", ipfsCid);
        const userData = await getUserDataFromHash(ipfsCid);
        console.log("User data fetched from IPFS:", userData);
        return userData;      
    } catch (error) {
        console.error("Error fetching user data from blockchain:", error);
        throw error;
    }
}
