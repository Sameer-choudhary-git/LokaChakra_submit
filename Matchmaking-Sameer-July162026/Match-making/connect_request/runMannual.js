const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');
const fs = require('fs');

// Program ID from your contract
const PROGRAM_ID = new PublicKey('HEpY4ioYdpMHkrLCA6J7aMpm2xTMppK7yGrcuPYsU8Qq');
const RPC_URL = 'http://localhost:8899';

// Manual Serialization Helpers
class BufferWriter {
  constructor() {
    this.buffers = [];
  }

  writeU8(value) {
    const buf = Buffer.alloc(1);
    buf.writeUInt8(value, 0);
    this.buffers.push(buf);
  }

  writeBool(value) {
    // Borsh serializes bool as 0 or 1 (single byte)
    const buf = Buffer.alloc(1);
    buf.writeUInt8(value ? 1 : 0, 0);
    this.buffers.push(buf);
  }

  writeU64(value) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(value), 0);
    this.buffers.push(buf);
  }

  writePubkey(pubkey) {
    this.buffers.push(pubkey.toBuffer());
  }

  writeString(str) {
    const strBuf = Buffer.from(str, 'utf8');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32LE(strBuf.length, 0);
    this.buffers.push(lenBuf);
    this.buffers.push(strBuf);
  }

  writeOptionString(str) {
    if (str === null || str === undefined) {
      this.writeU8(0); // None
    } else {
      this.writeU8(1); // Some
      this.writeString(str);
    }
  }

  toBuffer() {
    return Buffer.concat(this.buffers);
  }
}

// Serialization functions for each instruction
function serializeSendRequest(receiver, needsCid, requestId, message) {
  const writer = new BufferWriter();
  writer.writePubkey(receiver);
  writer.writeString(needsCid);
  writer.writeU64(requestId);
  writer.writeString(message);
  return writer.toBuffer();
}

function serializeRespondRequest(requestId, sender, receiverNeedsCid, approve, message) {
  const writer = new BufferWriter();
  writer.writeU64(requestId);
  writer.writePubkey(sender);
  writer.writeOptionString(receiverNeedsCid);
  writer.writeBool(approve);
  writer.writeString(message);
  return writer.toBuffer();
}

function serializeFinalApproval(requestId, receiver, approve) {
  const writer = new BufferWriter();
  writer.writeU64(requestId);
  writer.writePubkey(receiver);
  writer.writeBool(approve);
  return writer.toBuffer();
}

function serializeRejectRequest(requestId, otherParty, isReceiver) {
  const writer = new BufferWriter();
  writer.writeU64(requestId);
  writer.writePubkey(otherParty);
  writer.writeBool(isReceiver);
  return writer.toBuffer();
}

// Helper functions
function findProgramAddress(seeds, programId) {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

function getRequestPDA(sender, receiver, requestId) {
  const requestIdBuffer = Buffer.alloc(8);
  requestIdBuffer.writeBigUInt64LE(BigInt(requestId));

  return findProgramAddress(
    [
      Buffer.from('request'),
      sender.toBuffer(),
      receiver.toBuffer(),
      requestIdBuffer,
    ],
    PROGRAM_ID
  );
}

function getInboxPDA(user) {
  return findProgramAddress(
    [Buffer.from('inbox'), user.toBuffer()],
    PROGRAM_ID
  );
}

async function airdrop(connection, publicKey, amount = 2) {
  console.log(`  💰 Airdropping ${amount} SOL to ${publicKey.toBase58().slice(0, 8)}...`);
  const signature = await connection.requestAirdrop(
    publicKey,
    amount * 1e9
  );
  await connection.confirmTransaction(signature);
  console.log(`  ✅ Airdrop confirmed`);
}

// Instruction builders
async function sendConnectionRequest(connection, sender, receiver, requestId, needsCid, message) {
  console.log('\n📤 Sending Connection Request...');
  console.log(`  From: ${sender.publicKey.toBase58()}`);
  console.log(`  To: ${receiver.toBase58()}`);
  console.log(`  Request ID: ${requestId}`);
  console.log(`  Needs CID: ${needsCid}`);
  console.log(`  Message: "${message}"`);

  const [requestPDA] = getRequestPDA(sender.publicKey, receiver, requestId);
  const [receiverInboxPDA] = getInboxPDA(receiver);
  const [senderInboxPDA] = getInboxPDA(sender.publicKey);

  console.log(`  Request PDA: ${requestPDA.toBase58()}`);
  console.log(`  Receiver Inbox PDA: ${receiverInboxPDA.toBase58()}`);
  console.log(`  Sender Inbox PDA: ${senderInboxPDA.toBase58()}`);

  const serialized = serializeSendRequest(receiver, needsCid, requestId, message);
  const instructionData = Buffer.concat([Buffer.from([0]), serialized]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: sender.publicKey, isSigner: true, isWritable: true },
      { pubkey: requestPDA, isSigner: false, isWritable: true },
      { pubkey: receiverInboxPDA, isSigner: false, isWritable: true },
      { pubkey: senderInboxPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  const signature = await sendAndConfirmTransaction(connection, transaction, [sender], {
    commitment: 'confirmed',
  });
  console.log(`  ✅ Request sent! Signature: ${signature}`);
  return { signature, requestPDA, receiverInboxPDA, senderInboxPDA };
}

async function respondToRequest(connection, receiver, sender, requestId, approve, receiverNeedsCid, message) {
  console.log('\n📥 Responding to Connection Request...');
  console.log(`  Receiver: ${receiver.publicKey.toBase58()}`);
  console.log(`  Request ID: ${requestId}`);
  console.log(`  Approve: ${approve}`);
  console.log(`  Receiver Needs CID: ${receiverNeedsCid || 'None'}`);
  console.log(`  Message: "${message}"`);

  const [requestPDA] = getRequestPDA(sender, receiver.publicKey, requestId);
  const [receiverInboxPDA] = getInboxPDA(receiver.publicKey);

  const serialized = serializeRespondRequest(requestId, sender, receiverNeedsCid, approve, message);
  const instructionData = Buffer.concat([Buffer.from([1]), serialized]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: receiver.publicKey, isSigner: true, isWritable: true },
      { pubkey: requestPDA, isSigner: false, isWritable: true },
      { pubkey: receiverInboxPDA, isSigner: false, isWritable: true },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  const signature = await sendAndConfirmTransaction(connection, transaction, [receiver], {
    commitment: 'confirmed',
  });
  console.log(`  ✅ Response sent! Signature: ${signature}`);
  return signature;
}

async function finalApproval(connection, sender, receiver, requestId, approve) {
  console.log('\n✔️ Sending Final Approval...');
  console.log(`  Sender: ${sender.publicKey.toBase58()}`);
  console.log(`  Request ID: ${requestId}`);
  console.log(`  Approve: ${approve}`);

  const [requestPDA] = getRequestPDA(sender.publicKey, receiver, requestId);

  const serialized = serializeFinalApproval(requestId, receiver, approve);
  const instructionData = Buffer.concat([Buffer.from([2]), serialized]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: sender.publicKey, isSigner: true, isWritable: true },
      { pubkey: requestPDA, isSigner: false, isWritable: true },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  const signature = await sendAndConfirmTransaction(connection, transaction, [sender], {
    commitment: 'confirmed',
  });
  console.log(`  ✅ Final approval sent! Signature: ${signature}`);
  return signature;
}

async function rejectRequest(connection, signer, otherParty, requestId, isReceiver) {
  console.log('\n❌ Rejecting Connection Request...');
  console.log(`  Signer: ${signer.publicKey.toBase58()}`);
  console.log(`  Request ID: ${requestId}`);
  console.log(`  Is Receiver: ${isReceiver}`);

  const [requestPDA] = isReceiver
    ? getRequestPDA(otherParty, signer.publicKey, requestId)
    : getRequestPDA(signer.publicKey, otherParty, requestId);
  const [inboxPDA] = getInboxPDA(signer.publicKey);

  const serialized = serializeRejectRequest(requestId, otherParty, isReceiver);
  const instructionData = Buffer.concat([Buffer.from([3]), serialized]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: signer.publicKey, isSigner: true, isWritable: true },
      { pubkey: requestPDA, isSigner: false, isWritable: true },
      { pubkey: inboxPDA, isSigner: false, isWritable: true },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  const signature = await sendAndConfirmTransaction(connection, transaction, [signer], {
    commitment: 'confirmed',
  });
  console.log(`  ✅ Request rejected! Signature: ${signature}`);
  return signature;
}

async function getUserRequests(connection, user) {
  console.log('\n📋 Getting User Requests...');
  console.log(`  User: ${user.publicKey.toBase58()}`);

  const [inboxPDA] = getInboxPDA(user.publicKey);
  const instructionData = Buffer.from([4]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: user.publicKey, isSigner: true, isWritable: false },
      { pubkey: inboxPDA, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  const signature = await sendAndConfirmTransaction(connection, transaction, [user], {
    commitment: 'confirmed',
  });
  console.log(`  ✅ Signature: ${signature}`);
  return signature;
}

// Test scenarios
async function testScenario1_SimpleApproval(connection, alice, bob) {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST SCENARIO 1: Simple Approval (No Negotiation)');
  console.log('='.repeat(60));
  const requestId = Date.now();

  await sendConnectionRequest(
    connection,
    alice,
    bob.publicKey,
    requestId,
    'QmAliceNeeds123abc',
    'Hey Bob! Want to connect?'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  await respondToRequest(
    connection,
    bob,
    alice.publicKey,
    requestId,
    true,
    null,
    'Sure Alice, sounds good!'
  );
  console.log('\n✅ SCENARIO 1 COMPLETE: Connection approved immediately!');
}

async function testScenario2_WithNegotiation(connection, alice, bob) {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST SCENARIO 2: Approval with Negotiation');
  console.log('='.repeat(60));
  const requestId = Date.now() + 1;

  await sendConnectionRequest(
    connection,
    alice,
    bob.publicKey,
    requestId,
    'QmAliceNeeds456def',
    'Hi Bob, let me know your thoughts'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  await respondToRequest(
    connection,
    bob,
    alice.publicKey,
    requestId,
    true,
    'QmBobNeeds789ghi',
    'Great! Here are my requirements too.'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  await finalApproval(
    connection,
    alice,
    bob.publicKey,
    requestId,
    true
  );
  console.log('\n✅ SCENARIO 2 COMPLETE: Connection approved after negotiation!');
}

async function testScenario3_ReceiverRejects(connection, alice, bob) {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST SCENARIO 3: Receiver Rejects Request');
  console.log('='.repeat(60));
  const requestId = Date.now() + 2;

  await sendConnectionRequest(
    connection,
    alice,
    bob.publicKey,
    requestId,
    'QmAliceNeeds000',
    'One more request Bob'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  await respondToRequest(
    connection,
    bob,
    alice.publicKey,
    requestId,
    false,
    null,
    'Sorry Alice, not this time'
  );
  console.log('\n✅ SCENARIO 3 COMPLETE: Request rejected by receiver!');
}

async function testScenario4_NegotiationRejected(connection, alice, bob) {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST SCENARIO 4: Sender Rejects After Negotiation');
  console.log('='.repeat(60));
  const requestId = Date.now() + 3;

  await sendConnectionRequest(
    connection,
    alice,
    bob.publicKey,
    requestId,
    'QmAliceNeeds111',
    'Let me see what you need'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  await respondToRequest(
    connection,
    bob,
    alice.publicKey,
    requestId,
    true,
    'QmBobNeeds222',
    'Here are my terms'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  await finalApproval(
    connection,
    alice,
    bob.publicKey,
    requestId,
    false
  );
  console.log('\n✅ SCENARIO 4 COMPLETE: Request rejected after negotiation!');
}

async function testScenario5_DirectRejection(connection, alice, bob) {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST SCENARIO 5: Direct Rejection (Using Reject Instruction)');
  console.log('='.repeat(60));
  const requestId = Date.now() + 4;

  await sendConnectionRequest(
    connection,
    alice,
    bob.publicKey,
    requestId,
    'QmAliceNeeds333',
    'Please consider this'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  await rejectRequest(
    connection,
    bob,
    alice.publicKey,
    requestId,
    true
  );
  console.log('\n✅ SCENARIO 5 COMPLETE: Direct rejection successful!');
}

async function checkInboxes(connection, alice, bob) {
  console.log('\n' + '='.repeat(60));
  console.log('📬 CHECKING INBOXES');
  console.log('='.repeat(60));

  try {
    console.log('\n--- Alice\'s Inbox ---');
    await getUserRequests(connection, alice);
  } catch (e) {
    console.log('  ⚠️ Error:', e.message);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    console.log('\n--- Bob\'s Inbox ---');
    await getUserRequests(connection, bob);
  } catch (e) {
    console.log('  ⚠️ Error:', e.message);
  }
}

// Main execution
async function main() {
  console.log('\n' + '🚀'.repeat(30));
  console.log('CONNECTION REQUEST SMART CONTRACT TEST SUITE');
  console.log('🚀'.repeat(30));

  const connection = new Connection(RPC_URL, 'confirmed');

  const alice = Keypair.generate();
  const bob = Keypair.generate();
  console.log('\n👥 Test Users Generated:');
  console.log(`  Alice: ${alice.publicKey.toBase58()}`);
  console.log(`  Bob: ${bob.publicKey.toBase58()}`);

  console.log('\n💰 Funding test accounts...');
  await airdrop(connection, alice.publicKey, 3);
  await airdrop(connection, bob.publicKey, 3);

  try {
    await testScenario1_SimpleApproval(connection, alice, bob);
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testScenario2_WithNegotiation(connection, alice, bob);
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testScenario3_ReceiverRejects(connection, alice, bob);
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testScenario4_NegotiationRejected(connection, alice, bob);
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testScenario5_DirectRejection(connection, alice, bob);
    await new Promise(resolve => setTimeout(resolve, 2000));

    await checkInboxes(connection, alice, bob);

    console.log('\n' + '🎉'.repeat(30));
    console.log('ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('🎉'.repeat(30));
    console.log('\n📊 Summary:');
    console.log('  ✅ Simple approval without negotiation');
    console.log('  ✅ Approval with negotiation (3-way handshake)');
    console.log('  ✅ Receiver rejection');
    console.log('  ✅ Sender rejection after negotiation');
    console.log('  ✅ Direct rejection using reject instruction');
    console.log('\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  sendConnectionRequest,
  respondToRequest,
  finalApproval,
  rejectRequest,
  getUserRequests,
  getRequestPDA,
  getInboxPDA,
};
