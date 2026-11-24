import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    AccountInfo,
    Keypair,
    SendOptions,
    ConfirmOptions,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import * as borsh from 'borsh';

// Program ID
export const PROGRAM_ID = new PublicKey('HSQ9vGvZtCy6CbUkgMD2RXeMeQ2dgtDZoUZ7EbRAdA1g');

// Instruction enum mapping
export enum InstructionType {
    CreateAgreement = 0,
    AcceptAgreement = 1,
    CloseAgreement = 2,
    MarkCheckpointDone = 3,
    GetAgreementStatus = 4,
    ReopenAgreement = 5,
}

// Error codes mapping from your Rust enum
export enum AgreementErrorCode {
    Unauthorized = 0,
    NotAccepted = 1,
    InvalidCheckpoint = 2,
    AlreadyAccepted = 3,
    CheckpointAlreadyDone = 4,
    AlreadyCompleted = 5,
    AlreadyClosed = 6,
    NotClosed = 7,
    InvalidCheckpointCount = 8,
    TooManyCheckpoints = 9,
    MetadataTooLong = 10,
    NotCompleted = 11,
    InvalidAccountData = 12,
    AccountNotWritable = 13,
    InsufficientFunds = 14,
}

// Data structures
export interface Agreement {
    matcher: PublicKey;
    matchee: PublicKey;
    isAccepted: boolean;
    metadataCid: string;
    totalCheckpoints: number;
    currentCheckpoint: number; // deprecated but kept for compatibility
    checkpointStatus: boolean[];
    isCompleted: boolean;
    isClosed: boolean;
    bump: number;
}

export interface AgreementStatus {
    isAccepted: boolean;
    isCompleted: boolean;
    isClosed: boolean;
    completedCheckpoints: number;
    totalCheckpoints: number;
    matcher: PublicKey;
    matchee: PublicKey;
    metadataCid: string;
}

// Instruction classes
class CreateAgreementInstruction {
    instruction: number;
    metadataCid: string;
    totalCheckpoints: number;

    constructor(metadataCid: string, totalCheckpoints: number) {
        this.instruction = InstructionType.CreateAgreement;
        this.metadataCid = metadataCid;
        this.totalCheckpoints = totalCheckpoints;
    }
}

class AcceptAgreementInstruction {
    instruction: number;

    constructor() {
        this.instruction = InstructionType.AcceptAgreement;
    }
}

class CloseAgreementInstruction {
    instruction: number;

    constructor() {
        this.instruction = InstructionType.CloseAgreement;
    }
}

class MarkCheckpointDoneInstruction {
    instruction: number;
    index: number;

    constructor(index: number) {
        this.instruction = InstructionType.MarkCheckpointDone;
        this.index = index;
    }
}

class GetAgreementStatusInstruction {
    instruction: number;

    constructor() {
        this.instruction = InstructionType.GetAgreementStatus;
    }
}

class ReopenAgreementInstruction {
    instruction: number;

    constructor() {
        this.instruction = InstructionType.ReopenAgreement;
    }
}

// Borsh schemas for serialization
const createAgreementSchema = new Map([
    [CreateAgreementInstruction, {
        kind: 'struct',
        fields: [
            ['instruction', 'u8'],
            ['metadataCid', 'string'],
            ['totalCheckpoints', 'u8'],
        ]
    }]
]);

const acceptAgreementSchema = new Map([
    [AcceptAgreementInstruction, {
        kind: 'struct',
        fields: [
            ['instruction', 'u8'],
        ]
    }]
]);

const closeAgreementSchema = new Map([
    [CloseAgreementInstruction, {
        kind: 'struct',
        fields: [
            ['instruction', 'u8'],
        ]
    }]
]);

const markCheckpointDoneSchema = new Map([
    [MarkCheckpointDoneInstruction, {
        kind: 'struct',
        fields: [
            ['instruction', 'u8'],
            ['index', 'u8'],
        ]
    }]
]);

const getAgreementStatusSchema = new Map([
    [GetAgreementStatusInstruction, {
        kind: 'struct',
        fields: [
            ['instruction', 'u8'],
        ]
    }]
]);

const reopenAgreementSchema = new Map([
    [ReopenAgreementInstruction, {
        kind: 'struct',
        fields: [
            ['instruction', 'u8'],
        ]
    }]
]);

// FIX: Removed the unused 'agreementSchema' constant which caused the ReferenceError.
// The SDK uses the manual `parseAgreementData` function for deserialization instead.

// Wallet interface
export interface Wallet {
    publicKey: PublicKey;
    signTransaction(transaction: Transaction): Promise<Transaction>;
    signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
}

// Main SDK class
export class MatchAgreementSDK {
    private connection: Connection;
    private programId: PublicKey;

    constructor(connection: Connection, programId: PublicKey | string = PROGRAM_ID) {
        this.connection = connection;
        if (typeof programId === 'string') {
            this.programId = new PublicKey(programId);
        } else {
            this.programId = programId;
        }
    }

    /**
     * Generate PDA for an agreement between matcher and matchee
     */
    async getAgreementPDA(matcher: PublicKey, matchee: PublicKey): Promise<{ publicKey: PublicKey; bump: number }> {
        const [agreementPDA, bump] = await PublicKey.findProgramAddress(
            [
                Buffer.from("agreement"),
                matcher.toBuffer(),
                matchee.toBuffer()
            ],
            this.programId
        );

        return { publicKey: agreementPDA, bump };
    }
    
    /**
     * Create a new agreement instruction
     */
    async createCreateAgreementInstruction(
        matcher: PublicKey,
        matchee: PublicKey,
        metadataCid: string,
        totalCheckpoints: number
    ): Promise<TransactionInstruction> {
        if (totalCheckpoints === 0) throw new Error('Total checkpoints must be greater than 0');
        if (totalCheckpoints > 50) throw new Error('Too many checkpoints (max 50)');
        if (metadataCid.length > 200) throw new Error('Metadata CID too long (max 200 characters)');

        const { publicKey: agreementPDA } = await this.getAgreementPDA(matcher, matchee);
        
        const instruction = new CreateAgreementInstruction(metadataCid, totalCheckpoints);
        const data = Buffer.from(borsh.serialize(createAgreementSchema, instruction));

        return new TransactionInstruction({
            keys: [
                { pubkey: matcher, isSigner: true, isWritable: true },
                { pubkey: matchee, isSigner: false, isWritable: false },
                { pubkey: agreementPDA, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.programId,
            data,
        });
    }

    /**
     * Create an accept agreement instruction
     */
    async createAcceptAgreementInstruction(
        matcher: PublicKey,
        matchee: PublicKey
    ): Promise<TransactionInstruction> {
        const { publicKey: agreementPDA } = await this.getAgreementPDA(matcher, matchee);
        
        const instruction = new AcceptAgreementInstruction();
        const data = Buffer.from(borsh.serialize(acceptAgreementSchema, instruction));

        return new TransactionInstruction({
            keys: [
                { pubkey: matchee, isSigner: true, isWritable: false },
                { pubkey: agreementPDA, isSigner: false, isWritable: true },
            ],
            programId: this.programId,
            data,
        });
    }

    /**
     * Create a close agreement instruction
     */
    async createCloseAgreementInstruction(
        matcher: PublicKey,
        matchee: PublicKey,
        signer: PublicKey
    ): Promise<TransactionInstruction> {
        const { publicKey: agreementPDA } = await this.getAgreementPDA(matcher, matchee);
        
        const instruction = new CloseAgreementInstruction();
        const data = Buffer.from(borsh.serialize(closeAgreementSchema, instruction));

        return new TransactionInstruction({
            keys: [
                { pubkey: signer, isSigner: true, isWritable: false },
                { pubkey: agreementPDA, isSigner: false, isWritable: true },
            ],
            programId: this.programId,
            data,
        });
    }

    /**
     * Create a mark checkpoint done instruction
     */
    async createMarkCheckpointDoneInstruction(
        matcher: PublicKey,
        matchee: PublicKey,
        checkpointIndex: number
    ): Promise<TransactionInstruction> {
        const { publicKey: agreementPDA } = await this.getAgreementPDA(matcher, matchee);
        
        const instruction = new MarkCheckpointDoneInstruction(checkpointIndex);
        const data = Buffer.from(borsh.serialize(markCheckpointDoneSchema, instruction));

        return new TransactionInstruction({
            keys: [
                { pubkey: matcher, isSigner: true, isWritable: false },
                { pubkey: agreementPDA, isSigner: false, isWritable: true },
            ],
            programId: this.programId,
            data,
        });
    }

    /**
     * Create a get agreement status instruction
     */
    async createGetAgreementStatusInstruction(
        matcher: PublicKey,
        matchee: PublicKey
    ): Promise<TransactionInstruction> {
        const { publicKey: agreementPDA } = await this.getAgreementPDA(matcher, matchee);
        
        const instruction = new GetAgreementStatusInstruction();
        const data = Buffer.from(borsh.serialize(getAgreementStatusSchema, instruction));

        return new TransactionInstruction({
            keys: [
                { pubkey: agreementPDA, isSigner: false, isWritable: false },
            ],
            programId: this.programId,
            data,
        });
    }

    /**
     * Create a reopen agreement instruction
     */
    async createReopenAgreementInstruction(
        matcher: PublicKey,
        matchee: PublicKey,
        signer: PublicKey
    ): Promise<TransactionInstruction> {
        const { publicKey: agreementPDA } = await this.getAgreementPDA(matcher, matchee);
        
        const instruction = new ReopenAgreementInstruction();
        const data = Buffer.from(borsh.serialize(reopenAgreementSchema, instruction));

        return new TransactionInstruction({
            keys: [
                { pubkey: signer, isSigner: true, isWritable: false },
                { pubkey: agreementPDA, isSigner: false, isWritable: true },
            ],
            programId: this.programId,
            data,
        });
    }

    /**
     * Create a new agreement
     */
    async createAgreement(
        wallet: Wallet,
        matchee: PublicKey,
        metadataCid: string,
        totalCheckpoints: number,
        options?: SendOptions
    ): Promise<string> {
        const instruction = await this.createCreateAgreementInstruction(
            wallet.publicKey,
            matchee,
            metadataCid,
            totalCheckpoints
        );
        console.log("Creating agreement with metadata CID: sdk", metadataCid);

        const transaction = new Transaction().add(instruction);
        transaction.feePayer = wallet.publicKey;
        transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

        const signedTransaction = await wallet.signTransaction(transaction);
        return await this.connection.sendRawTransaction(signedTransaction.serialize(), options);
    }

    /**
     * Accept an existing agreement
     */
    async acceptAgreement(
        matcheeWallet: Wallet,
        matcher: PublicKey,
        options?: SendOptions
    ): Promise<string> {
        const instruction = await this.createAcceptAgreementInstruction(
            matcher,
            matcheeWallet.publicKey
        );

        const transaction = new Transaction().add(instruction);
        transaction.feePayer = matcheeWallet.publicKey;
        transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

        const signedTransaction = await matcheeWallet.signTransaction(transaction);
        return await this.connection.sendRawTransaction(signedTransaction.serialize(), options);
    }

    /**
     * Close an agreement
     */
    async closeAgreement(
        signerWallet: Wallet,
        otherParty: PublicKey,
        options?: SendOptions
    ): Promise<string> {
        const matcher = signerWallet.publicKey.toBase58() < otherParty.toBase58() 
            ? signerWallet.publicKey 
            : otherParty;
        const matchee = signerWallet.publicKey.toBase58() < otherParty.toBase58() 
            ? otherParty 
            : signerWallet.publicKey;

        const instruction = await this.createCloseAgreementInstruction(
            matcher,
            matchee,
            signerWallet.publicKey
        );

        const transaction = new Transaction().add(instruction);
        transaction.feePayer = signerWallet.publicKey;
        transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

        const signedTransaction = await signerWallet.signTransaction(transaction);
        return await this.connection.sendRawTransaction(signedTransaction.serialize(), options);
    }

    /**
     * Mark a checkpoint as done
     */
    async markCheckpointDone(
        matcherWallet: Wallet,
        matchee: PublicKey,
        checkpointIndex: number,
        options?: SendOptions
    ): Promise<string> {
        const instruction = await this.createMarkCheckpointDoneInstruction(
            matcherWallet.publicKey,
            matchee,
            checkpointIndex
        );

        const transaction = new Transaction().add(instruction);
        transaction.feePayer = matcherWallet.publicKey;
        transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

        const signedTransaction = await matcherWallet.signTransaction(transaction);
        return await this.connection.sendRawTransaction(signedTransaction.serialize(), options);
    }

    /**
     * Reopen a closed agreement
     */
    async reopenAgreement(
        signerWallet: Wallet,
        otherParty: PublicKey,
        options?: SendOptions
    ): Promise<string> {
        const matcher = signerWallet.publicKey.toBase58() < otherParty.toBase58() 
            ? signerWallet.publicKey 
            : otherParty;
        const matchee = signerWallet.publicKey.toBase58() < otherParty.toBase58() 
            ? otherParty 
            : signerWallet.publicKey;

        const instruction = await this.createReopenAgreementInstruction(
            matcher,
            matchee,
            signerWallet.publicKey
        );

        const transaction = new Transaction().add(instruction);
        transaction.feePayer = signerWallet.publicKey;
        transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

        const signedTransaction = await signerWallet.signTransaction(transaction);
        return await this.connection.sendRawTransaction(signedTransaction.serialize(), options);
    }

    /**
     * Get agreement account data
     */
    async getAgreement(matcher: PublicKey, matchee: PublicKey): Promise<Agreement | null> {
        try {
            const { publicKey: agreementPDA } = await this.getAgreementPDA(matcher, matchee);
            const accountInfo = await this.connection.getAccountInfo(agreementPDA);
            
            if (!accountInfo || !accountInfo.data) {
                return null;
            }

            return this.parseAgreementData(accountInfo.data);
        } catch (error) {
            console.error('Error fetching agreement:', error);
            return null;
        }
    }

    /**
     * Parse agreement account data
     */
    private parseAgreementData(data: Buffer): Agreement {
        const agreementData = data.slice(8); // Skip 8-byte discriminator
        
        let offset = 0;
        
        const matcher = new PublicKey(agreementData.slice(offset, offset + 32));
        offset += 32;
        
        const matchee = new PublicKey(agreementData.slice(offset, offset + 32));
        offset += 32;
        
        const isAccepted = agreementData[offset] === 1;
        offset += 1;
        
        const metadataCidLength = agreementData.readUInt32LE(offset);
        offset += 4;
        const metadataCid = agreementData.slice(offset, offset + metadataCidLength).toString('utf8');
        offset += metadataCidLength;
        
        const totalCheckpoints = agreementData[offset];
        offset += 1;
        
        const currentCheckpoint = agreementData[offset]; // Deprecated field
        offset += 1;
        
        const checkpointStatusLength = agreementData.readUInt32LE(offset);
        offset += 4;
        const checkpointStatus = [];
        for (let i = 0; i < checkpointStatusLength; i++) {
            checkpointStatus.push(agreementData[offset + i] === 1);
        }
        offset += checkpointStatusLength;
        
        const isCompleted = agreementData[offset] === 1;
        offset += 1;
        
        const isClosed = agreementData[offset] === 1;
        offset += 1;
        
        const bump = agreementData[offset];
        
        return {
            matcher,
            matchee,
            isAccepted,
            metadataCid,
            totalCheckpoints,
            currentCheckpoint,
            checkpointStatus,
            isCompleted,
            isClosed,
            bump,
        };
    }

    /**
     * Get all agreements for a user (as matcher or matchee)
     */
    async getUserAgreements(userPublicKey: PublicKey): Promise<{ publicKey: PublicKey; account: Agreement }[]> {
        try {
            // This filter finds accounts where the user is the first key (matcher)
            const asMatcherPromise = this.connection.getProgramAccounts(this.programId, {
                filters: [
                    { dataSize: 350 }, // Filter by exact account size to narrow results
                    { memcmp: { offset: 8, bytes: userPublicKey.toBase58() } }, // Offset 8 for the matcher field
                ],
            });
    
            // This filter finds accounts where the user is the second key (matchee)
            const asMatcheePromise = this.connection.getProgramAccounts(this.programId, {
                filters: [
                    { dataSize: 350 }, // Filter by exact account size
                    { memcmp: { offset: 40, bytes: userPublicKey.toBase58() } }, // Offset 8 (disc) + 32 (matcher) = 40
                ],
            });

            const [asMatcher, asMatchee] = await Promise.all([asMatcherPromise, asMatcheePromise]);

            const allAccounts = [...asMatcher, ...asMatchee];
            const uniqueAccounts = Array.from(new Map(allAccounts.map(acc => [acc.pubkey.toBase58(), acc])).values());

            const agreements: { publicKey: PublicKey; account: Agreement }[] = [];
            
            for (const { pubkey, account } of uniqueAccounts) {
                try {
                    const agreementData = this.parseAgreementData(account.data);
                    agreements.push({
                        publicKey: pubkey,
                        account: agreementData,
                    });
                } catch (error) {
                    console.warn(`Failed to parse agreement at ${pubkey.toBase58()}:`, error);
                }
            }

            return agreements;
        } catch (error) {
            console.error('Error fetching user agreements:', error);
            throw error;
        }
    }

    /**
     * Get agreement status with computed values
     */
    async getAgreementStatus(matcher: PublicKey, matchee: PublicKey): Promise<AgreementStatus | null> {
        const agreement = await this.getAgreement(matcher, matchee);
        if (!agreement) return null;

        const completedCheckpoints = agreement.checkpointStatus.filter(status => status).length;

        return {
            isAccepted: agreement.isAccepted,
            isCompleted: agreement.isCompleted,
            isClosed: agreement.isClosed,
            completedCheckpoints,
            totalCheckpoints: agreement.totalCheckpoints,
            matcher: agreement.matcher,
            matchee: agreement.matchee,
            metadataCid: agreement.metadataCid,
        };
    }

    /**
     * Wait for transaction confirmation
     */
    async confirmTransaction(signature: string, options?: ConfirmOptions): Promise<void> {
        const latestBlockHash = await this.connection.getLatestBlockhash();
        await this.connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: signature
        }, options?.commitment || 'confirmed');
    }

    /**
     * Utility: Generate a new keypair
     */
    static generateKeypair(): Keypair {
        return Keypair.generate();
    }

    /**
     * Utility: Get progress percentage
     */
    static getProgressPercentage(completedCheckpoints: number, totalCheckpoints: number): number {
        if (totalCheckpoints === 0) return 0;
        return Math.round((completedCheckpoints / totalCheckpoints) * 100);
    }

    /**
     * Utility: Format agreement for display
     */
    static formatAgreement(agreement: Agreement): Agreement & { 
        progressPercentage: number; 
        completedCheckpoints: number;
        status: string;
    } {
        const completedCheckpoints = agreement.checkpointStatus.filter(status => status).length;
        const progressPercentage = this.getProgressPercentage(completedCheckpoints, agreement.totalCheckpoints);
        
        let status = 'Pending';
        if (agreement.isClosed) {
            status = 'Closed';
        } else if (agreement.isCompleted) {
            status = 'Completed';
        } else if (agreement.isAccepted) {
            status = 'Active';
        }

        return {
            ...agreement,
            completedCheckpoints,
            progressPercentage,
            status,
        };
    }
}

export default MatchAgreementSDK;