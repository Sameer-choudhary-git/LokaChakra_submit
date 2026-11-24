"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { useCallback } from "react";
import {
  createSendConnectionRequestInstruction,
  createRespondToRequestInstruction,
  createFinalApprovalInstruction,
  fetchConnectionRequest,
  findConnectionRequestsByIds,
  getRequestPDA,
  ConnectionRequest,
  RequestStatus,
  PROGRAM_ID,
  createRejectRequestInstruction,
} from "./solana-program";


export function useSolanaProgram() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const sendConnectionRequest = useCallback(
    async (
      receiverAddress: string,
      needsIpfsCid: string,
      requestId: bigint,
      message: string
    ) => {
      if (!publicKey) throw new Error("Wallet not connected");

      try {
        // Validate inputs
        if (!receiverAddress) throw new Error("Receiver address is required");
        if (!needsIpfsCid) throw new Error("IPFS CID is required");
        if (!message) throw new Error("Message is required");

        const receiver = new PublicKey(receiverAddress);

        // Validate receiver address format
        if (!PublicKey.isOnCurve(receiver.toBytes())) {
          throw new Error("Invalid receiver wallet address format");
        }

        // Ensure sender is not sending to themselves
        if (receiver.equals(publicKey)) {
          throw new Error("Cannot send connection request to yourself");
        }

        // Check if request already exists
        const [requestPDA] = getRequestPDA(publicKey, receiver, requestId);
        const existingRequest = await fetchConnectionRequest(
          connection,
          requestPDA
        );
        if (existingRequest) {
          throw new Error(
            `A request with ID ${requestId} already exists between these addresses`
          );
        }

        const latestBlockhash = await connection.getLatestBlockhash("confirmed");

        const instruction = createSendConnectionRequestInstruction(
          publicKey,
          receiver,
          requestId,
          needsIpfsCid,
          message
        );

        const transaction = new Transaction().add(instruction);
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.feePayer = publicKey;

        const signature = await sendTransaction(transaction, connection, {
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 3,
        });

        await connection.confirmTransaction(
          {
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          },
          "confirmed"
        );

        return signature;
      } catch (error) {
        console.error("Error in sendConnectionRequest:", error);

        if (error instanceof Error) {
          if (error.name === "WalletSendTransactionError") {
            throw new Error(
              `Wallet transaction failed: ${error.message}. Please try again.`
            );
          }
          if (error.message.includes("User rejected")) {
            throw new Error("Transaction was rejected by user");
          }
          if (error.message.includes("insufficient funds")) {
            throw new Error(
              "Insufficient SOL balance to pay for transaction fees"
            );
          }
          if (error.message.includes("blockhash not found")) {
            throw new Error(
              "Network congestion detected. Please try again in a moment."
            );
          }
        }

        throw error;
      }
    },
    [publicKey, connection, sendTransaction]
  );

  const respondToRequest = useCallback(
    async (
      senderAddress: string,
      requestId: bigint,
      receiverNeedsCid: string | null,
      approve: boolean,
      message: string
    ) => {
      console.log("🚀 respondToRequest called with:", {
        senderAddress,
        requestId: requestId.toString(),
        receiverNeedsCid,
        approve,
        message,
        connectedWallet: publicKey?.toBase58(),
      });

      if (!publicKey) {
        console.error("❌ Wallet not connected in respondToRequest");
        throw new Error("Wallet not connected");
      }

      try {
        console.log("⏳ Starting respondToRequest validation...");

        // Validate inputs
        if (!senderAddress) {
          console.error("❌ Sender address is required");
          throw new Error("Sender address is required");
        }
        if (!message) {
          console.error("❌ Message is required");
          throw new Error("Message is required");
        }

        console.log("✅ Input validation passed");

        const sender = new PublicKey(senderAddress);
        console.log("✅ Sender PublicKey created:", sender.toBase58());

        // Pre-flight check: Validate sender address format
        if (!PublicKey.isOnCurve(sender.toBytes())) {
          console.error("❌ Invalid sender wallet address format");
          throw new Error("Invalid sender wallet address format");
        }
        console.log("✅ Sender address format validated");

        // Pre-flight check: Check if request exists
        console.log("🔍 Getting request PDA...");
        const [requestPDA] = getRequestPDA(sender, publicKey, requestId);
        console.log("✅ Request PDA:", requestPDA.toBase58());

        console.log("🔍 Fetching existing request...");
        const existingRequest = await fetchConnectionRequest(
          connection,
          requestPDA
        );

        if (!existingRequest) {
          console.error("❌ Request not found:", {
            requestId: requestId.toString(),
            sender: sender.toBase58(),
            receiver: publicKey.toBase58(),
            requestPDA: requestPDA.toBase58(),
          });
          throw new Error(`Request with ID ${requestId} not found`);
        }

        console.log("✅ Existing request found:", {
          id: existingRequest.id.toString(),
          status: existingRequest.status,
          sender: existingRequest.sender.toBase58(),
          receiver: existingRequest.receiver.toBase58(),
          sender_message: existingRequest.sender_message,
          receiver_message: existingRequest.receiver_message,
        });

        // Pre-flight check: Verify request status
        if (existingRequest.status !== RequestStatus.Pending) {
          console.error("❌ Request is not in pending status:", {
            currentStatus: existingRequest.status,
            expectedStatus: RequestStatus.Pending,
            statusNames: {
              0: "Pending",
              1: "Negotiating",
              2: "Approved",
              3: "Rejected",
              4: "Cancelled",
            },
          });
          throw new Error(
            `Request is not in pending status. Current status: ${existingRequest.status}`
          );
        }
        console.log("✅ Request status validated (Pending)");

        // Pre-flight check: Verify receiver authority
        if (!existingRequest.receiver.equals(publicKey)) {
          console.error("❌ Not authorized to respond:", {
            requestReceiver: existingRequest.receiver.toBase58(),
            connectedWallet: publicKey.toBase58(),
          });
          throw new Error("You are not authorized to respond to this request");
        }
        console.log("✅ Receiver authority validated");

        console.log("🔍 Getting latest blockhash...");
        const latestBlockhash = await connection.getLatestBlockhash(
          "confirmed"
        );
        console.log("✅ Latest blockhash:", latestBlockhash.blockhash);

        console.log("🔧 Creating respond instruction...");
        const instruction = createRespondToRequestInstruction(
          publicKey,
          sender,
          requestId,
          receiverNeedsCid,
          approve,
          message
        );
        console.log("✅ Instruction created successfully");

        console.log("📦 Building transaction...");
        const transaction = new Transaction().add(instruction);
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.feePayer = publicKey;
        console.log("✅ Transaction built:", {
          recentBlockhash: transaction.recentBlockhash,
          feePayer: transaction.feePayer?.toBase58(),
          instructionCount: transaction.instructions.length,
        });

        console.log("📤 Sending transaction...");
        const signature = await sendTransaction(transaction, connection, {
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 3,
        });
        console.log("✅ Transaction sent with signature:", signature);

        console.log("⏳ Waiting for transaction confirmation...");
        await connection.confirmTransaction(
          {
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          },
          "confirmed"
        );
        console.log("✅ Transaction confirmed successfully");

        return signature;
      } catch (error) {
        console.error("❌ Error in respondToRequest:", error);
        console.error("❌ Error type:", typeof error);
        console.error(
          "❌ Error name:",
          error instanceof Error ? error.name : "Unknown"
        );
        console.error(
          "❌ Error message:",
          error instanceof Error ? error.message : String(error)
        );

        if (error instanceof Error) {
          if (error.name === "WalletSendTransactionError") {
            console.error(
              "❌ Wallet transaction error detected:",
              error.message
            );
            throw new Error(
              `Wallet transaction failed: ${error.message}. Please try again.`
            );
          }
          if (error.message.includes("User rejected")) {
            console.error("❌ User rejected transaction");
            throw new Error("Transaction was rejected by user");
          }
          if (error.message.includes("insufficient funds")) {
            console.error("❌ Insufficient funds");
            throw new Error(
              "Insufficient SOL balance to pay for transaction fees"
            );
          }
          if (error.message.includes("Transaction simulation failed")) {
            throw new Error(
              "Transaction simulation failed. The request may already be processed or invalid."
            );
          }
        }

        throw error;
      }
    },
    [publicKey, connection, sendTransaction]
  );

  const finalApproval = useCallback(
    async (receiverAddress: string, requestId: bigint, approve: boolean) => {
      if (!publicKey) throw new Error("Wallet not connected");

      try {
        const receiver = new PublicKey(receiverAddress);

        // Validate PDA and check request exists
        const [requestPDA] = getRequestPDA(publicKey, receiver, requestId);
        const existingRequest = await fetchConnectionRequest(
          connection,
          requestPDA
        );

        if (!existingRequest) {
          throw new Error(`Request with ID ${requestId} not found`);
        }

        if (existingRequest.status !== RequestStatus.Negotiating) {
          throw new Error(
            `Request is not in negotiating status. Current status: ${existingRequest.status}`
          );
        }

        const instruction = createFinalApprovalInstruction(
          publicKey,
          receiver,
          requestId,
          approve
        );

        const latestBlockhash = await connection.getLatestBlockhash(
          "confirmed"
        );
        const transaction = new Transaction().add(instruction);
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.feePayer = publicKey;

        const signature = await sendTransaction(transaction, connection, {
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 3,
        });

        await connection.confirmTransaction(
          {
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          },
          "confirmed"
        );

        return signature;
      } catch (error) {
        console.error("Error in finalApproval:", error);
        if (error instanceof Error) {
          if (error.name === "WalletSendTransactionError") {
            throw new Error(
              `Wallet transaction failed: ${error.message}. Please try again.`
            );
          }
          if (error.message.includes("User rejected")) {
            throw new Error("Transaction was rejected by user");
          }
        }
        throw error;
      }
    },
    [publicKey, connection, sendTransaction]
  );

  const rejectRequest = useCallback(
  async (
    otherPartyAddress: string,
    requestId: bigint,
    isReceiver: boolean
  ) => {
    console.log("🚫 rejectRequest called with:", {
      otherPartyAddress,
      requestId: requestId.toString(),
      isReceiver,
      connectedWallet: publicKey?.toBase58()
    })

    if (!publicKey) {
      console.error("❌ Wallet not connected in rejectRequest")
      throw new Error("Wallet not connected")
    }

    try {
      // ENHANCED: Input validation
      if (!otherPartyAddress?.trim()) {
        throw new Error("Other party address is required")
      }

      const otherParty = new PublicKey(otherPartyAddress)

      if (!PublicKey.isOnCurve(otherParty.toBytes())) {
        console.error("❌ Invalid other party wallet address format")
        throw new Error("Invalid other party wallet address format")
      }

      // ENHANCED: PDA validation before transaction
      const [requestPDA] = getRequestPDA(
        isReceiver ? otherParty : publicKey,
        isReceiver ? publicKey : otherParty,
        requestId
      )

      console.log("🔍 PDA validation:", {
        requestPDA: requestPDA.toBase58(),
        calculatedFrom: {
          sender: isReceiver ? otherParty.toBase58() : publicKey.toBase58(),
          receiver: isReceiver ? publicKey.toBase58() : otherParty.toBase58(),
          requestId: requestId.toString()
        }
      })

      // Check if account exists
      console.log("🔍 Checking if request account exists...")
      const accountInfo = await connection.getAccountInfo(requestPDA)
      if (!accountInfo) {
        throw new Error("Request not found - it may have been deleted or never existed")
      }
      console.log("✅ Request account exists")

      console.log("🔍 Getting latest blockhash for rejection...")
      const latestBlockhash = await connection.getLatestBlockhash('confirmed')
      console.log("✅ Latest blockhash:", latestBlockhash.blockhash)

      console.log("🔧 Creating reject instruction...")
      const instruction = createRejectRequestInstruction(
        publicKey,
        otherParty,
        requestId,
        isReceiver
      )
      
      console.log("📦 Building rejection transaction...")
      const transaction = new Transaction().add(instruction)
      transaction.recentBlockhash = latestBlockhash.blockhash
      transaction.feePayer = publicKey
      console.log("✅ Rejection transaction built")

      console.log("📤 Sending rejection transaction...")
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      })
      console.log("✅ Rejection transaction sent with signature:", signature)

      console.log("⏳ Waiting for rejection transaction confirmation...")
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, "confirmed")
      console.log("✅ Rejection transaction confirmed successfully")

      return signature
    } catch (error) {
      console.error("❌ Error in rejectRequest:", error)
      
      // Enhanced error logging
      if ((error as any).logs) {
        console.log("🔍 Transaction logs:", (error as any).logs)
      }
      
      // Re-throw with context
      if (error instanceof Error) {
        if (error.name === 'WalletSendTransactionError') {
          throw new Error(`Wallet transaction failed: ${error.message}`)
        }
        if (error.message.includes('User rejected')) {
          throw new Error("Transaction was rejected by user")
        }
        if (error.message.includes('insufficient funds')) {
          throw new Error("Insufficient SOL balance to pay for transaction fees")
        }
        if (error.message.includes('Transaction simulation failed')) {
          throw new Error("Transaction simulation failed. The request may already be processed or invalid.")
        }
        if (error.message.includes('Account does not exist')) {
          throw new Error("Request not found or has been deleted")
        }
      }
      
      throw error
    }
  },
  [publicKey, connection, sendTransaction]
);

  const getConnectionRequest = useCallback(
    async (
      sender: PublicKey,
      receiver: PublicKey,
      requestId: bigint
    ): Promise<ConnectionRequest | null> => {
      const [requestPDA] = getRequestPDA(sender, receiver, requestId);
      return await fetchConnectionRequest(connection, requestPDA);
    },
    [connection]
  );

  const generateRequestId = useCallback(() => {
    // Generate a more unique ID to prevent collisions
    const timestamp = BigInt(Date.now());
    const random = BigInt(Math.floor(Math.random() * 1000000));
    return timestamp * BigInt(1000000) + random;
  }, []);

  const getAllRequests = useCallback(
    async (user: PublicKey) => {
      try {
        console.log("🔍 Loading all requests for user:", user.toBase58());

        const allForSenders = await connection.getProgramAccounts(PROGRAM_ID, {
          filters: [
            {
              memcmp: {
                offset: 8,
                bytes: user.toBase58(),
              },
            },
          ],
        });

        const allForRecievers = await connection.getProgramAccounts(
          PROGRAM_ID,
          {
            filters: [
              {
                memcmp: {
                  offset: 8 + 32,
                  bytes: user.toBase58(),
                },
              },
            ],
          }
        );

        console.log(
          `📤 Found ${allForSenders.length} accounts where user is sender`
        );
        console.log(
          `📥 Found ${allForRecievers.length} accounts where user is receiver`
        );

        const deserializedForSenders = await deserializeAccounts([
          ...allForSenders,
        ]);
        const deserializedForRecievers = await deserializeAccounts([
          ...allForRecievers,
        ]);

        return {
          deserializedForSenders,
          deserializedForRecievers,
        };
      } catch (error) {
        console.error("Error in getAllRequests:", error);
        return {
          deserializedForSenders: [],
          deserializedForRecievers: [],
        };
      }
    },
    [connection]
  );

  async function deserializeAccounts(
    ConnectionAccounts: any[]
  ): Promise<ConnectionRequest[]> {
    const ans: ConnectionRequest[] = [];

    for (const account of ConnectionAccounts) {
      try {
        const connectionRequest = ConnectionRequest.deserialize(
          account.account.data
        );
        console.log(
          `✅ Deserialized request: ID=${connectionRequest.id}, Status=${
            connectionRequest.status
          }, Sender=${connectionRequest.sender
            .toBase58()
            .slice(0, 8)}..., Receiver=${connectionRequest.receiver
            .toBase58()
            .slice(0, 8)}...`
        );
        ans.push(connectionRequest);
      } catch (error) {
        console.error("Error deserializing account:", error);
      }
    }

    console.log(`📊 Successfully deserialized ${ans.length} requests`);
    return ans;
  }

  return {
    connected: !!publicKey,
    publicKey,
    sendConnectionRequest,
    respondToRequest,
    finalApproval,
    rejectRequest,
    getConnectionRequest,
    generateRequestId,
    RequestStatus,
    getAllRequests,
  };
}
