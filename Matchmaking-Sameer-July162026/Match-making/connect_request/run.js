const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');
const borsh = require('borsh');
const fs = require('fs');

// Program ID from your contract
const PROGRAM_ID = new PublicKey('HEpY4ioYdpMHkrLCA6J7aMpm2xTMppK7yGrcuPYsU8Qq');
const RPC_URL = 'http://localhost:8899';

// Borsh schemas for serialization
class SendRequestData {
  constructor(fields) {
    this.receiver = fields.receiver;
    this.needs_ipfs_cid = fields.needs_ipfs_cid;
    this.request_id = fields.request_id;
    this.message = fields.message;
  }
}

class RespondRequestData {
  constructor(fields) {
    this.request_id = fields.request_id;
    this.sender = fields.sender;
    this.receiver_needs_cid = fields.receiver_needs_cid;
    this.approve = fields.approve;
    this.message = fields.message;
  }
}

class FinalApprovalData {
  constructor(fields) {
    this.request_id = fields.request_id;
    this.receiver = fields.receiver;
    this.approve = fields.approve;
  }
}

class RejectRequestData {
  constructor(fields) {
    this.request_id = fields.request_id;
    this.other_party = fields.other_party;
    this.is_receiver = fields.is_receiver;
  }
}

// Borsh schemas
const sendRequestSchema = new Map([
  [
    SendRequestData,
    {
      kind: 'struct',
      fields: [
        ['receiver', ['u8', 32]], // <-- FIX
        ['needs_ipfs_cid', 'string'],
        ['request_id', 'u64'],
        ['message', 'string'],
      ],
    },
  ],
]);

const respondRequestSchema = new Map([
  [
    RespondRequestData,
    {
      kind: 'struct',
      fields: [
        ['request_id', 'u64'],
        ['sender', ['u8', 32]], // <-- FIX
        ['receiver_needs_cid', { kind: 'option', type: 'string' }],
        ['approve', 'u8'],
        ['message', 'string'],
      ],
    },
  ],
]);

const finalApprovalSchema = new Map([
  [
    FinalApprovalData,
    {
      kind: 'struct',
      fields: [
        ['request_id', 'u64'],
        ['receiver', ['u8', 32]], // <-- FIX
        ['approve', 'u8'],
      ],
    },
  ],
]);

const rejectRequestSchema = new Map([
  [
    RejectRequestData,
    {
      kind: 'struct',
      fields: [
        ['request_id', 'u64'],
        ['other_party', ['u8', 32]], // <-- FIX
        ['is_receiver', 'u8'],
      ],
    },
  ],
]);

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
    amount * 1e9 // Convert to lamports
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

  const data = new SendRequestData({
    receiver: Array.from(receiver.toBuffer()),
    needs_ipfs_cid: needsCid,
    request_id: requestId,
    message: message,
  });

  const serialized = borsh.serialize(sendRequestSchema, data);
  const instructionData = Buffer.concat([Buffer.from([0]), Buffer.from(serialized)]);

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

  const data = new RespondRequestData({
    request_id: requestId,
    sender: Array.from(sender.toBuffer()),
    receiver_needs_cid: receiverNeedsCid,
    approve: approve ? 1 : 0,
    message: message,
  });

  const serialized = borsh.serialize(respondRequestSchema, data);
  const instructionData = Buffer.concat([Buffer.from([1]), Buffer.from(serialized)]);

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

  const data = new FinalApprovalData({
    request_id: requestId,
    receiver: Array.from(receiver.toBuffer()),
    approve: approve ? 1 : 0,
  });

  const serialized = borsh.serialize(finalApprovalSchema, data);
  const instructionData = Buffer.concat([Buffer.from([2]), Buffer.from(serialized)]);

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

  const data = new RejectRequestData({
    request_id: requestId,
    other_party: Array.from(otherParty.toBuffer()),
    is_receiver: isReceiver ? 1 : 0,
  });

  const serialized = borsh.serialize(rejectRequestSchema, data);
  const instructionData = Buffer.concat([Buffer.from([3]), Buffer.from(serialized)]);

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
  const instructionData = Buffer.from([4]); // Instruction discriminator for GetUserRequests

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

  // Step 1: Alice sends request to Bob
  await sendConnectionRequest(
    connection,
    alice,
    bob.publicKey,
    requestId,
    'QmAliceNeeds123abc',
    'Hey Bob! Want to connect?'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 2: Bob approves without adding his needs
  await respondToRequest(
    connection,
    bob,
    alice.publicKey,
    requestId,
    true,
    null, // No counter-needs
    'Sure Alice, sounds good!'
  );
  console.log('\n✅ SCENARIO 1 COMPLETE: Connection approved immediately!');
}

async function testScenario2_WithNegotiation(connection, alice, bob) {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST SCENARIO 2: Approval with Negotiation');
  console.log('='.repeat(60));
  const requestId = Date.now() + 1;

  // Step 1: Alice sends request
  await sendConnectionRequest(
    connection,
    alice,
    bob.publicKey,
    requestId,
    'QmAliceNeeds456def',
    'Hi Bob, let me know your thoughts'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 2: Bob responds with his own needs (triggers negotiation)
  await respondToRequest(
    connection,
    bob,
    alice.publicKey,
    requestId,
    true,
    'QmBobNeeds789ghi', // Bob adds his needs
    'Great! Here are my requirements too.'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 3: Alice gives final approval after reviewing Bob's needs
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

  // Step 1: Alice sends request
  await sendConnectionRequest(
    connection,
    alice,
    bob.publicKey,
    requestId,
    'QmAliceNeeds000',
    'One more request Bob'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 2: Bob rejects
  await respondToRequest(
    connection,
    bob,
    alice.publicKey,
    requestId,
    false, // Reject
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

  // Step 1: Alice sends request
  await sendConnectionRequest(
    connection,
    alice,
    bob.publicKey,
    requestId,
    'QmAliceNeeds111',
    'Let me see what you need'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 2: Bob responds with needs
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

  // Step 3: Alice rejects after seeing Bob's needs
  await finalApproval(
    connection,
    alice,
    bob.publicKey,
    requestId,
    false // Reject
  );
  console.log('\n✅ SCENARIO 4 COMPLETE: Request rejected after negotiation!');
}

async function testScenario5_DirectRejection(connection, alice, bob) {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST SCENARIO 5: Direct Rejection (Using Reject Instruction)');
  console.log('='.repeat(60));
  const requestId = Date.now() + 4;

  // Step 1: Alice sends request
  await sendConnectionRequest(
    connection,
    alice,
    bob.publicKey,
    requestId,
    'QmAliceNeeds333',
    'Please consider this'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 2: Bob directly rejects using reject instruction
  await rejectRequest(
    connection,
    bob,
    alice.publicKey,
    requestId,
    true // Bob is the receiver
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

  // Create test users
  const alice = Keypair.generate();
  const bob = Keypair.generate();
  console.log('\n👥 Test Users Generated:');
  console.log(`  Alice: ${alice.publicKey.toBase58()}`);
  console.log(`  Bob: ${bob.publicKey.toBase58()}`);

  // Airdrop SOL to test users
  console.log('\n💰 Funding test accounts...');
  await airdrop(connection, alice.publicKey, 3);
  await airdrop(connection, bob.publicKey, 3);

  try {
    // Run all test scenarios
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

    // Check final state
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

// Run if executed directly
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
