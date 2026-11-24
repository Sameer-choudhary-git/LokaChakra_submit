const amqp = require('amqplib');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');

if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}


class UserProcessingQueue {
    constructor() { 
        this.connection = null;
        this.channel = null;
        this.queueName = 'user_validation_queue';
        this.deadLetterQueue = 'user_validation_dlq';
        this.retryQueue = 'user_validation_retry';
        this.usersFilePath = path.join(__dirname, 'users.json');
        this.tempFilePath = path.join(__dirname, 'users_temp.json');
        this.backupFilePath = path.join(__dirname, 'users_backup.json');
    }

    async connect() {
        try {
            // Connect with connection recovery and heartbeat
            const user = process.env.RABBITMQ_DEFAULT_USER;
            const pass = process.env.RABBITMQ_DEFAULT_PASS;
            const host = 'rabbitmq'; // Service name in Docker network
            const url = `amqp://${user}:${pass}@${host}:5672`;
            console.log(`Connecting to RabbitMQ at ${url}...`);

            this.connection = await amqp.connect(url, {
                heartbeat: 60,
                timeout: 30000
            });
            console.log('RabbitMQ connection established successfully');
            this.channel = await this.connection.createChannel();
            console.log('RabbitMQ channel created successfully');

            // Enable connection recovery
            this.connection.on('error', (err) => {
                console.error('RabbitMQ connection error:', err);
                setTimeout(() => this.connect(), 5000); // Reconnect after 5 seconds
            });

            await this.setupQueues();
            console.log('Connected to RabbitMQ successfully');
        } catch (error) {
            console.error('Failed to connect to RabbitMQ:', error);
            setTimeout(() => this.connect(), 5000); // Retry connection
        }
    }

    async setupQueues() {
        // Setup main queue with persistence and dead letter exchange
        await this.channel.assertQueue(this.queueName, {
            durable: true, // Survives server restarts
            messageTtl: 1800000, // 30 minutes TTL
            deadLetterExchange: '',
            deadLetterRoutingKey: this.deadLetterQueue,
            maxRetries: 3
        });

        // Setup dead letter queue for failed messages
        await this.channel.assertQueue(this.deadLetterQueue, {
            durable: true
        });

        // Setup retry queue
        await this.channel.assertQueue(this.retryQueue, {
            durable: true,
            messageTtl: 300000, // 5 minutes before retry
            deadLetterExchange: '',
            deadLetterRoutingKey: this.queueName
        });

        // Set prefetch to process one message at a time
        await this.channel.prefetch(1);
    }

    async getUserFilePath(role) {
        switch (role) {
            case 'founder':
                return path.join(__dirname, '../data/founder_users.json');
            case 'investor':
                return path.join(__dirname, '../data/investor_users.json');
            case 'accelerator':
                return path.join(__dirname, '../data/accelerator_users.json');
            case 'executive':
                return path.join(__dirname, '../data/executive_users.json');
            case 'legal':
                return path.join(__dirname, '../data/legal_users.json');
            case 'government':
                return path.join(__dirname, '../data/government_users.json');
            case 'cybersecurity':
                return path.join(__dirname, '../data/cybersecurity_users.json');
            case 'freelancer':
                return path.join(__dirname, '../data/freelancer_users.json');
            case 'mentor_research':
                return path.join(__dirname, '../data/mentor_research_users.json');
            case 'exit_planner':
                return path.join(__dirname, '../data/exit_planner_users.json');
            default:
                throw new Error(`Invalid role: ${role}`);
        }
    }

    async addUserToQueue(userData) {
        try {
            const message = JSON.stringify({
                ...userData,
                attempts: 0,
                addedAt: Date.now()
            });

            const result = await this.channel.sendToQueue(this.queueName, Buffer.from(message), {
                persistent: true, // Message survives server restart
                messageId: `${userData.profilePDA}_${Date.now()}`,
                timestamp: Date.now()
            });
            if (!result) {
                throw new Error('Failed to send message to queue');
            }
            console.log(`User ${userData.profilePDA} added to validation queue`);
            return true;
        } catch (error) {
            console.error('Error adding user to queue:', error);
            throw error;
        }
    }

    async startProcessing() {
        try {
            console.log('Starting user validation processor...');

            await this.channel.consume(this.queueName, async (msg) => {
                if (msg) {
                    let userData;
                    try {
                        userData = JSON.parse(msg.content.toString());
                        console.log(`Processing user: ${userData.profilePDA}`);

                        const userAddedAt = userData.addedAt;
                        const currentTime = Date.now();
                        const waitTime = Math.max(0, 15000 - (currentTime - userAddedAt));
                        
                        if (waitTime > 0) {
                            console.log(`Waiting ${waitTime}ms before processing user: ${userData.profilePDA}`);
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, waitTime));

                        const isValid = await this.validateUser(userData);
                        if (isValid) {
                            await this.addUserToFile(userData);
                            this.channel.ack(msg);
                            console.log(`User ${userData.profilePDA} successfully processed`);
                        } else {
                            await this.handleFailedValidation(userData, msg);
                        }
                    } catch (error) {
                        console.error('Error processing message:', error);
                        await this.handleProcessingError(userData, msg, error);
                    }
                }
            }, {
                noAck: false // Manual acknowledgment
            });
        } catch (error) {
            console.error('Error starting processor:', error);
            throw error;
        }
    }

    async validateUser(userData) {
        try {
            const connection = new Connection("https://api.devnet.solana.com", "confirmed");
            const { profilePDA, signature, userPublicKey } = userData;
            const accountInfo = await connection.getAccountInfo(new PublicKey(profilePDA));

            if (!accountInfo) {
                console.log(`PDA account not found: ${profilePDA}`);
                return false;
            }
            //check account have data?
            if (accountInfo.data.length === 0) {
                console.log(`PDA account is empty: ${profilePDA}`);
                return false;
            }




            let userProfile;
            try {
                userProfile = deserialization(accountInfo.data);
            } catch (e) {
                console.error('Deserialization error:', e);
                return false;
            }
            if (userProfile.authority !== userPublicKey) {
                console.log(`User public key mismatch. Expected: ${userProfile.authority}, Got: ${userPublicKey}`);
                return false;
            }
            if (userProfile.ipfs_cid !== userData.cid) {
                console.log(`IPFS CID mismatch. Expected: ${userProfile.ipfs_cid}, Got: ${userData.cid}`);
                return false;
            }

            console.log(`User validation successful: ${profilePDA}`);
            return true;
        } catch (error) {
            console.error('Validation error:', error);
            return false;
        }
    }

    async addUserToFile(userData) {
        try {
            await this.createBackup();
            const roleFileMap = {
                founder: 'founder_users.json',
                investor: 'investor_users.json',
                accelerator: 'accelerator_users.json',
                executive: 'executive_users.json',
                legal: 'legal_users.json',
                government: 'government_users.json',
                cybersecurity: 'cybersecurity_users.json',
                freelancer: 'freelancer_users.json',
                mentor_research: 'mentor_research_users.json',
                exit_planner: 'exit_planner_users.json'
            };

            const roleFileName = roleFileMap[userData.role];
            if (!roleFileName) {
                throw new Error(`Invalid role: ${userData.role}`);
            }

            // Construct full file path using data directory
            const baseDataDir = path.join(__dirname, '../data');
            const roleFilePath = path.join(baseDataDir, roleFileName);
            const tempRoleFilePath = path.join(baseDataDir, `temp_${roleFileName}`);


            let users = [];
            try {
                const data = await fs.readFile(roleFilePath, 'utf8');
                users = JSON.parse(data);
            } catch (error) {
                // File doesn't exist or is empty, start with empty array
                users = [];
            }

            // Check if user already exists in this role file
            const existingUser = users.find(user => user.profilePDA === userData.profilePDA);
            if (existingUser) {
                console.log(`User already exists in ${roleFileName}: ${userData.profilePDA}`);
                return;
            }

            const userDataFromIPFS = await getUserDataFromHash(userData.cid);


            // Add new user - combine original userData with IPFS data
            const finalUserData = userDataFromIPFS.user || {};
            users.push(finalUserData);

            // Ensure data directory exists
            await fs.mkdir(baseDataDir, { recursive: true });

            await fs.writeFile(tempRoleFilePath, JSON.stringify(users, null, 2));

            // Atomic move to final location
            await fs.rename(tempRoleFilePath, roleFilePath);

            console.log(`User added to ${roleFileName} successfully: ${userData.profilePDA}`);

        } catch (error) {
            console.error('Error adding user to role file:', error);
            // Restore from backup if needed
            // await this.restoreFromRoleBackup(userData.role);
            throw error;
        }
    }


    async createBackup() {
        try {
            await fs.copyFile(this.usersFilePath, this.backupFilePath);
        } catch (error) {
            // Backup creation failed, but don't throw error if original file doesn't exist
            if (error.code !== 'ENOENT') {
                console.error('Error creating backup:', error);
            }
        }
    }

    async restoreFromBackup() {
        try {
            await fs.copyFile(this.backupFilePath, this.usersFilePath);
            console.log('Restored from backup successfully');
        } catch (error) {
            console.error('Error restoring from backup:', error);
        }
    }

    async handleFailedValidation(userData, msg) {
        userData.attempts = (userData.attempts || 0) + 1;

        if (userData.attempts >= 3) {
            // Max retries reached, send to dead letter queue
            console.log(`Max retries reached for user: ${userData.profilePDA}`);
            this.channel.nack(msg, false, false); // Don't requeue
        } else {
            // Send to retry queue
            console.log(`Retrying user validation: ${userData.profilePDA} (attempt ${userData.attempts})`);
            await this.channel.sendToQueue(this.retryQueue, Buffer.from(JSON.stringify(userData)), {
                persistent: true
            });
            this.channel.ack(msg);
        }
    }

    async handleProcessingError(userData, msg, error) {
        console.error(`Processing error for user ${userData?.profilePDA}:`, error);
        await this.logError(userData, error);
        this.channel.nack(msg, false, false);
    }

    async logError(userData, error) {
        const errorLog = {
            userData,
            error: error.message,
            stack: error.stack,
            timestamp: Date.now()
        };

        try {
            await fs.appendFile(
                path.join(__dirname, 'error.log'),
                JSON.stringify(errorLog) + '\n'
            );
        } catch (logError) {
            console.error('Failed to log error:', logError);
        }
    }

    async getQueueStatus() {
        try {
            const mainQueue = await this.channel.checkQueue(this.queueName);
            const dlq = await this.channel.checkQueue(this.deadLetterQueue);
            const retryQueue = await this.channel.checkQueue(this.retryQueue);

            return {
                mainQueue: mainQueue.messageCount,
                deadLetterQueue: dlq.messageCount,
                retryQueue: retryQueue.messageCount
            };
        } catch (error) {
            console.error('Error getting queue status:', error);
            return null;
        }
    }
}

function base64ToBase58(base64String) {
    try {
        // Convert base64 to buffer
        const buffer = Buffer.from(base64String, 'base64');
        // Create PublicKey from buffer and return as base58 string
        return new PublicKey(buffer).toBase58();
    } catch (error) {
        console.error('Error converting base64 to base58:', error);
        throw error;
    }
}




async function getUserDataFromHash(cid) {
    const gateways = [
        'https://ipfs.io/ipfs/',
        'https://gateway.ipfs.io/ipfs/',
        'https://cloudflare-ipfs.com/ipfs/',
        'https://dweb.link/ipfs/',
        'https://ipfs.infura.io/ipfs/',
        'https://gateway.pinata.cloud/ipfs/',
        'https://ipfs.fleek.co/ipfs/',
        'https://cf-ipfs.com/ipfs/'
    ];  

    if (!cid || typeof cid !== 'string') {
        throw new Error('Invalid CID provided');
    }

    for (const gateway of gateways) {
        try {
            const response = await fetch(`${gateway}${cid}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch from ${gateway}: ${response.statusText}`);
            }
            const data = await response.json();
            if (!data || typeof data !== 'object') {
                throw new Error(`Invalid data format from ${gateway}`);
            } 
            return data;
        } catch (error) {
            console.error(`Error fetching from ${gateway}:`, error);
        }
    }
}

function deserialization(data) {
    try {
        let offset = 0;
        const readBytes = (length) => {
            const bytes = data.slice(offset, offset + length);
            offset += length;
            return bytes;
        };

        const readU32 = () => {
            const bytes = readBytes(4);
            return bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
        };

        const readI64 = () => {
            const bytes = readBytes(8);
            let value = 0n;
            for (let i = 0; i < 8; i++) {
                value |= BigInt(bytes[i]) << BigInt(i * 8);
            }
            return Number(value);
        };

        const readBool = () => {
            return readBytes(1)[0] === 1;
        };

        const readString = () => {
            const length = readU32();
            const stringBytes = readBytes(length);
            return new TextDecoder().decode(stringBytes);
        };

        const readPubkey = () => {
            const bytes = readBytes(32);
            // Convert to Base58 instead of Base64
            return base64ToBase58(Buffer.from(bytes).toString('base64'));
        };

        const profile = {};

        // Read authority (Pubkey - 32 bytes) - now returns Base58
        profile.authority = readPubkey();
        console.log(`Authority: ${profile.authority}`);

        // Read is_active (bool - 1 byte)
        profile.is_active = readBool();

        // Read created_at (i64 - 8 bytes)
        profile.created_at = readI64();

        // Read updated_at (i64 - 8 bytes)
        profile.updated_at = readI64();

        // Read role flags (all bool - 1 byte each)
        profile.founder = readBool();
        profile.investor = readBool();
        profile.accelerator = readBool();
        profile.executive = readBool();
        profile.legal = readBool();
        profile.government = readBool();
        profile.cybersecurity = readBool();
        profile.freelancer = readBool();
        profile.mentor_research = readBool();
        profile.exit_planner = readBool();

        // Read IPFS CID (String - 4 bytes length + N bytes data)
        profile.ipfs_cid = readString();

        // Add userPublicKey field (same as authority, now in Base58)
        profile.userPublicKey = profile.authority;

        return profile;

    } catch (error) {
        console.error('Manual deserialization error:', error);
        throw new Error(`Failed to deserialize profile data: ${error.message}`);
    }
}
// Export functions for external use
async function addUserToQueue(userData) {
    const userQueue = new UserProcessingQueue();
    await userQueue.connect();
    return userQueue.addUserToQueue(userData);
}

async function getQueueStatus() {
    const userQueue = new UserProcessingQueue();
    await userQueue.connect();
    return userQueue.getQueueStatus();
}
module.exports = {
    UserProcessingQueue,
    addUserToQueue,
    getQueueStatus
};
