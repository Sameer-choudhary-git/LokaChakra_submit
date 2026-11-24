import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js"
import bs58 from "bs58"
import { PROGRAM_ID } from "./config"

// Export PROGRAM_ID from centralized config
export { PROGRAM_ID }

export enum InstructionType {
  SendConnectionRequest = 0,
  RespondToRequest = 1,
  FinalApproval = 2,
  RejectRequest = 3,
  GetUserRequests = 4,
}

export enum RequestStatus {
  Pending = 0,
  Negotiating = 1,
  Approved = 2,
  Rejected = 3,
  Cancelled = 4,
}

class BufferWriter {
  private buffer: Buffer
  private offset: number

  constructor(size: number) {
    this.buffer = Buffer.alloc(size)
    this.offset = 0
  }

  writeU8(value: number): void {
    this.buffer.writeUInt8(value, this.offset)
    this.offset += 1
  }

  writeU32(value: number): void {
    this.buffer.writeUInt32LE(value, this.offset)
    this.offset += 4
  }

  writeU64(value: bigint): void {
    // Manual BigInt serialization for compatibility
    const arr = new Array(8)
    let temp = value
    for (let i = 0; i < 8; i++) {
      arr[i] = Number(temp & BigInt(0xff))
      temp >>= BigInt(8)
    }
    for (let i = 0; i < 8; i++) {
      this.buffer[this.offset + i] = arr[i]
    }
    this.offset += 8
  }

  writeI64(value: bigint): void {
    // Convert signed to unsigned representation
    const unsignedValue = value < 0 ? (BigInt(1) << BigInt(64)) + value : value
    this.writeU64(unsignedValue)
  }

  writeBool(value: boolean): void {
    this.buffer.writeUInt8(value ? 1 : 0, this.offset)
    this.offset += 1
  }

  writePublicKey(pubkey: PublicKey): void {
    pubkey.toBuffer().copy(this.buffer, this.offset)
    this.offset += 32
  }

  writeString(str: string): void {
    const utf8Buffer = Buffer.from(str, 'utf8')
    this.writeU32(utf8Buffer.length)
    utf8Buffer.copy(this.buffer, this.offset)
    this.offset += utf8Buffer.length
  }

  writeOptionString(str: string | null): void {
    if (str === null) {
      this.writeU8(0) // None
    } else {
      this.writeU8(1) // Some
      this.writeString(str)
    }
  }

  writeU64Array(arr: bigint[]): void {
    this.writeU32(arr.length)
    for (const item of arr) {
      this.writeU64(item)
    }
  }

  getBuffer(): Buffer {
    return this.buffer.slice(0, this.offset)
  }
}

class BufferReader {
  private buffer: Buffer
  private offset: number

  constructor(buffer: Buffer) {
    this.buffer = buffer
    this.offset = 0
  }

  readU8(): number {
    const value = this.buffer.readUInt8(this.offset)
    this.offset += 1
    return value
  }

  readU32(): number {
    const value = this.buffer.readUInt32LE(this.offset)
    this.offset += 4
    return value
  }

  readU64(): bigint {
    // Manual BigInt deserialization for compatibility
    let result = BigInt(0)
    for (let i = 0; i < 8; i++) {
      result |= BigInt(this.buffer[this.offset + i]) << BigInt(i * 8)
    }
    this.offset += 8
    return result
  }

  readI64(): bigint {
    const unsignedValue = this.readU64()
    // Convert back to signed if necessary
    const maxSigned = BigInt(1) << BigInt(63)
    return unsignedValue >= maxSigned ? unsignedValue - (BigInt(1) << BigInt(64)) : unsignedValue
  }

  readBool(): boolean {
    return this.readU8() === 1
  }

  readPublicKey(): PublicKey {
    const keyBuffer = this.buffer.slice(this.offset, this.offset + 32)
    this.offset += 32
    return new PublicKey(keyBuffer)
  }

  readString(): string {
    const length = this.readU32()
    const str = this.buffer.slice(this.offset, this.offset + length).toString('utf8')
    this.offset += length
    return str
  }

  readOptionString(): string | null {
    const hasValue = this.readU8()
    if (hasValue === 0) {
      return null
    }
    return this.readString()
  }

  readU64Array(): bigint[] {
    const length = this.readU32()
    const arr: bigint[] = []
    for (let i = 0; i < length; i++) {
      arr.push(this.readU64())
    }
    return arr
  }
}

// FIXED: Data structures now match the Rust smart contract exactly
export class SendRequestData {
  receiver: PublicKey
  needs_ipfs_cid: string
  request_id: bigint  // Changed from u64 to bigint to match JS usage
  message: string

  constructor(receiver: PublicKey, needs_ipfs_cid: string, request_id: bigint, message: string) {
    this.receiver = receiver
    this.needs_ipfs_cid = needs_ipfs_cid
    this.request_id = request_id
    this.message = message
  }

  serialize(): Buffer {
    const estimatedSize = 32 + 4 + this.needs_ipfs_cid.length + 8 + 4 + this.message.length
    const writer = new BufferWriter(estimatedSize)
    
    writer.writePublicKey(this.receiver)
    writer.writeString(this.needs_ipfs_cid)
    writer.writeU64(this.request_id)
    writer.writeString(this.message)
    
    return writer.getBuffer()
  }
}

// FIXED: RespondRequestData now matches Rust struct field order
export class RespondRequestData {
  request_id: bigint
  sender: PublicKey
  receiver_needs_cid: string | null
  approve: boolean
  message: string

  constructor(request_id: bigint, sender: PublicKey, receiver_needs_cid: string | null, approve: boolean, message: string) {
    this.request_id = request_id
    this.sender = sender
    this.receiver_needs_cid = receiver_needs_cid
    this.approve = approve
    this.message = message
  }

  serialize(): Buffer {
    const estimatedSize = 8 + 32 + 4 + (this.receiver_needs_cid?.length || 0) + 1 + 4 + this.message.length + 10
    const writer = new BufferWriter(estimatedSize)
    
    writer.writeU64(this.request_id)
    writer.writePublicKey(this.sender)
    writer.writeOptionString(this.receiver_needs_cid)
    writer.writeBool(this.approve)
    writer.writeString(this.message)
    
    return writer.getBuffer()
  }
}

export class FinalApprovalData {
  request_id: bigint
  receiver: PublicKey
  approve: boolean

  constructor(request_id: bigint, receiver: PublicKey, approve: boolean) {
    this.request_id = request_id
    this.receiver = receiver
    this.approve = approve
  }

  serialize(): Buffer {
    const writer = new BufferWriter(8 + 32 + 1)
    
    writer.writeU64(this.request_id)
    writer.writePublicKey(this.receiver)
    writer.writeBool(this.approve)
    
    return writer.getBuffer()
  }
}

export class RejectRequestData {
  request_id: bigint
  other_party: PublicKey
  is_receiver: boolean

  constructor(request_id: bigint, other_party: PublicKey, is_receiver: boolean) {
    this.request_id = request_id
    this.other_party = other_party
    this.is_receiver = is_receiver
  }

  // CRITICAL FIX: Proper Borsh serialization that matches Rust struct exactly
  serialize(): Buffer {
    const writer = new BufferWriter(8 + 32 + 1) // Exact size: u64 + PublicKey + bool
    
    writer.writeU64(this.request_id)
    writer.writePublicKey(this.other_party)
    writer.writeBool(this.is_receiver)
    
    return writer.getBuffer()
  }
}


export class ConnectionRequest {
  id: bigint
  sender: PublicKey
  receiver: PublicKey
  sender_needs_cid: string
  receiver_needs_cid: string | null
  status: RequestStatus
  created_at: bigint
  updated_at: bigint
  sender_approved: boolean
  receiver_approved: boolean
  sender_message: string
  receiver_message: string

  constructor(fields: {
    id: bigint
    sender: PublicKey
    receiver: PublicKey
    sender_needs_cid: string
    receiver_needs_cid: string | null
    status: RequestStatus
    created_at: bigint
    updated_at: bigint
    sender_approved: boolean
    receiver_approved: boolean
    sender_message: string
    receiver_message: string
  }) {
    this.id = fields.id
    this.sender = fields.sender
    this.receiver = fields.receiver
    this.sender_needs_cid = fields.sender_needs_cid
    this.receiver_needs_cid = fields.receiver_needs_cid
    this.status = fields.status
    this.created_at = fields.created_at
    this.updated_at = fields.updated_at
    this.sender_approved = fields.sender_approved
    this.receiver_approved = fields.receiver_approved
    this.sender_message = fields.sender_message
    this.receiver_message = fields.receiver_message
  }

  static deserialize(buffer: Buffer): ConnectionRequest {
    const reader = new BufferReader(buffer)
    
    return new ConnectionRequest({
      id: reader.readU64(),
      sender: reader.readPublicKey(),
      receiver: reader.readPublicKey(),
      sender_needs_cid: reader.readString(),
      receiver_needs_cid: reader.readOptionString(),
      status: reader.readU8() as RequestStatus,
      created_at: reader.readI64(),
      updated_at: reader.readI64(),
      sender_approved: reader.readBool(),
      receiver_approved: reader.readBool(),
      sender_message: reader.readString(),
      receiver_message: reader.readString(),
    })
  }
}

export class UserRequestInbox {
  user: PublicKey
  pending_requests: bigint[]
  sent_requests: bigint[]
  total_received: number
  total_sent: number
  last_updated: bigint

  constructor(fields: {
    user: PublicKey
    pending_requests: bigint[]
    sent_requests: bigint[]
    total_received: number
    total_sent: number
    last_updated: bigint
  }) {
    this.user = fields.user
    this.pending_requests = fields.pending_requests
    this.sent_requests = fields.sent_requests
    this.total_received = fields.total_received
    this.total_sent = fields.total_sent
    this.last_updated = fields.last_updated
  }

  static deserialize(buffer: Buffer): UserRequestInbox {
    const reader = new BufferReader(buffer)
    
    return new UserRequestInbox({
      user: reader.readPublicKey(),
      pending_requests: reader.readU64Array(),
      sent_requests: reader.readU64Array(),
      total_received: reader.readU32(),
      total_sent: reader.readU32(),
      last_updated: reader.readI64(),
    })
  }
}

// Helper functions to create PDAs matching the Rust smart contract
export function getRequestPDA(sender: PublicKey, receiver: PublicKey, requestId: bigint): [PublicKey, number] {
  const requestIdBytes = Buffer.alloc(8)
  let temp = requestId
  for (let i = 0; i < 8; i++) {
    requestIdBytes[i] = Number(temp & BigInt(0xff))
    temp >>= BigInt(8)
  }

  return PublicKey.findProgramAddressSync(
    [Buffer.from("request"), sender.toBuffer(), receiver.toBuffer(), requestIdBytes],
    PROGRAM_ID
  )
}

export function getInboxPDA(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("inbox"), user.toBuffer()], PROGRAM_ID)
}

// FIXED: Instruction builders now match the Rust smart contract account order exactly
export function createSendConnectionRequestInstruction(
  sender: PublicKey,
  receiver: PublicKey,
  requestId: bigint,
  needs_ipfs_cid: string,
  message: string
): TransactionInstruction {
  const [requestPDA] = getRequestPDA(sender, receiver, requestId)
  const [receiverInboxPDA] = getInboxPDA(receiver)
  const [senderInboxPDA] = getInboxPDA(sender)

  const data = new SendRequestData(receiver, needs_ipfs_cid, requestId, message)
  const serializedData = data.serialize()
  const instructionData = Buffer.concat([Buffer.from([InstructionType.SendConnectionRequest]), serializedData])

  return new TransactionInstruction({
    keys: [
      { pubkey: sender, isSigner: true, isWritable: false },        // sender_account
      { pubkey: requestPDA, isSigner: false, isWritable: true },    // request_account
      { pubkey: receiverInboxPDA, isSigner: false, isWritable: true }, // receiver_inbox_account
      { pubkey: senderInboxPDA, isSigner: false, isWritable: true },   // sender_inbox_account
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  })
}

export function createRespondToRequestInstruction(
  receiver: PublicKey,
  sender: PublicKey,
  requestId: bigint,
  receiver_needs_cid: string | null,
  approve: boolean,
  message: string
): TransactionInstruction {
  const [requestPDA] = getRequestPDA(sender, receiver, requestId)
  const [receiverInboxPDA] = getInboxPDA(receiver)

  const data = new RespondRequestData(requestId, sender, receiver_needs_cid, approve, message)
  const serializedData = data.serialize()
  const instructionData = Buffer.concat([Buffer.from([InstructionType.RespondToRequest]), serializedData])

  return new TransactionInstruction({
    keys: [
      { pubkey: receiver, isSigner: true, isWritable: false },      // receiver_account
      { pubkey: requestPDA, isSigner: false, isWritable: true },    // request_account
      { pubkey: receiverInboxPDA, isSigner: false, isWritable: true }, // receiver_inbox_account
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  })
}

export function createFinalApprovalInstruction(
  sender: PublicKey,
  receiver: PublicKey,
  requestId: bigint,
  approve: boolean
): TransactionInstruction {
  const [requestPDA] = getRequestPDA(sender, receiver, requestId)

  const data = new FinalApprovalData(requestId, receiver, approve)
  const serializedData = data.serialize()
  const instructionData = Buffer.concat([Buffer.from([InstructionType.FinalApproval]), serializedData])

  return new TransactionInstruction({
    keys: [
      { pubkey: sender, isSigner: true, isWritable: false },        // sender_account
      { pubkey: requestPDA, isSigner: false, isWritable: true },    // request_account
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  })
}

// CRITICAL FIX: RejectRequest instruction now passes is_receiver to match updated Rust struct

export function createRejectRequestInstruction(
  signer: PublicKey,
  otherParty: PublicKey,
  requestId: bigint,
  isReceiver: boolean
): TransactionInstruction {
  // CRITICAL FIX: Correct PDA calculation based on who is sender/receiver
  const [requestPDA] = getRequestPDA(
    isReceiver ? otherParty : signer,  // If signer is receiver, other_party is sender
    isReceiver ? signer : otherParty,  // If signer is receiver, signer is receiver
    requestId
  )
  
  const [inboxPDA] = getInboxPDA(signer)

  const data = new RejectRequestData(requestId, otherParty, isReceiver)
  const serializedData = data.serialize()
  const instructionData = Buffer.concat([Buffer.from([InstructionType.RejectRequest]), serializedData])

  console.log("🔧 RejectRequest instruction debug:", {
    signer: signer.toBase58(),
    otherParty: otherParty.toBase58(),
    requestId: requestId.toString(),
    isReceiver,
    requestPDA: requestPDA.toBase58(),
    inboxPDA: inboxPDA.toBase58(),
    dataLength: instructionData.length
  })

  return new TransactionInstruction({
    keys: [
      { pubkey: signer, isSigner: true, isWritable: false },        // signer_account
      { pubkey: requestPDA, isSigner: false, isWritable: true },    // request_account
      { pubkey: inboxPDA, isSigner: false, isWritable: true },      // inbox_account
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  })
}


export function createGetUserRequestsInstruction(user: PublicKey): TransactionInstruction {
  const [inboxPDA] = getInboxPDA(user)

  const instructionData = Buffer.from([InstructionType.GetUserRequests])

  return new TransactionInstruction({
    keys: [
      { pubkey: user, isSigner: true, isWritable: false },          // user_account
      { pubkey: inboxPDA, isSigner: false, isWritable: false },     // inbox_account
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  })
}

// Utility functions to fetch account data
export async function fetchConnectionRequest(connection: Connection, requestPDA: PublicKey): Promise<ConnectionRequest | null> {
  try {
    const accountInfo = await connection.getAccountInfo(requestPDA)
    if (!accountInfo || !accountInfo.data) return null

    return ConnectionRequest.deserialize(accountInfo.data)
  } catch (error) {
    console.error("Error fetching connection request:", error)
    return null
  }
}

export async function fetchUserInbox(connection: Connection, user: PublicKey): Promise<UserRequestInbox | null> {
  try {
    const [inboxPDA] = getInboxPDA(user)
    const accountInfo = await connection.getAccountInfo(inboxPDA)
    if (!accountInfo || !accountInfo.data) return null
    return UserRequestInbox.deserialize(accountInfo.data)
  } catch (error) {
    console.error("Error fetching user inbox:", error)
    return null
  }
}

// FIXED: Improved findConnectionRequestsByIds function - much more efficient
export async function findConnectionRequestsByIds(connection: Connection, user: PublicKey, requestIds: bigint[]): Promise<ConnectionRequest[]> {
  try {
    console.log("Finding connection requests by IDs:", {
      user: user.toBase58(),
      requestIds: requestIds.map(id => id.toString())
    });

    const requests: ConnectionRequest[] = []
    
    // Get all program accounts where user is either sender or receiver
    const [senderAccounts, receiverAccounts] = await Promise.all([
      // User as sender (offset 8 = after id field)
      connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          {
            memcmp: {
              offset: 8,
              bytes: user.toBase58()
            }
          }
        ]
      }),
      // User as receiver (offset 8 + 32 = after id + sender fields)
      connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          {
            memcmp: {
              offset: 8 + 32,
              bytes: user.toBase58()
            }
          }
        ]
      })
    ]);

    console.log(`Found ${senderAccounts.length} accounts where user is sender`);
    console.log(`Found ${receiverAccounts.length} accounts where user is receiver`);

    // Combine and deduplicate accounts
    const allAccounts = [...senderAccounts, ...receiverAccounts];
    const uniqueAccounts = allAccounts.filter((account, index, self) => 
      index === self.findIndex(a => a.pubkey.equals(account.pubkey))
    );

    console.log(`Processing ${uniqueAccounts.length} unique accounts`);

    for (const account of uniqueAccounts) {
      try {
        const request = ConnectionRequest.deserialize(account.account.data);
        
        // Check if this request ID is in our requested list
        if (requestIds.some(id => id === request.id)) {
          console.log(`Found matching request: ID=${request.id}, Status=${request.status}`);
          requests.push(request);
        }
      } catch (error) {
        console.error(`Error deserializing account ${account.pubkey.toBase58()}:`, error);
      }
    }

    console.log(`Total matching requests found: ${requests.length}`);
    return requests;
  } catch (error) {
    console.error("Error in findConnectionRequestsByIds:", error);
    return []
  }
}

// FIXED: Simplified and more efficient version
export async function findConnectionRequestsForUser(connection: Connection, user: PublicKey): Promise<ConnectionRequest[]> {
  try {
    const [senderAccounts, receiverAccounts] = await Promise.all([
      connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          {
            memcmp: {
              offset: 8, // After id field
              bytes: user.toBase58()
            }
          }
        ]
      }),
      connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          {
            memcmp: {
              offset: 8 + 32, // After id + sender fields
              bytes: user.toBase58()
            }
          }
        ]
      })
    ]);

    const allAccounts = [...senderAccounts, ...receiverAccounts];
    const uniqueAccounts = allAccounts.filter((account, index, self) => 
      index === self.findIndex(a => a.pubkey.equals(account.pubkey))
    );

    const requests: ConnectionRequest[] = [];
    
    for (const account of uniqueAccounts) {
      try {
        const request = ConnectionRequest.deserialize(account.account.data);
        requests.push(request);
      } catch (error) {
        console.error(`Error deserializing account ${account.pubkey.toBase58()}:`, error);
      }
    }

    return requests;
  } catch (error) {
    console.error("Error finding connection requests:", error)
    return []
  }
}

// Alternative approach: Get requests by fetching the user's inbox first
export async function getConnectionRequestsFromInbox(connection: Connection, user: PublicKey): Promise<ConnectionRequest[]> {
  try {
    const inbox = await fetchUserInbox(connection, user)
    if (!inbox) return []
    
    // Combine all request IDs
    const allRequestIds = [...inbox.pending_requests, ...inbox.sent_requests]
    
    // Use the findConnectionRequestsByIds function
    return await findConnectionRequestsByIds(connection, user, allRequestIds)
  } catch (error) {
    console.error("Error getting connection requests from inbox:", error)
    return []
  }
}
