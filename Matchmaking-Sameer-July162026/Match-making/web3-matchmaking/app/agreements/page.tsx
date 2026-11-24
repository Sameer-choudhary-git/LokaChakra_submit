"use client";

import { useState, useEffect } from "react";
import { useConnection, useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { PublicKey } from "@solana/web3.js";
import { MatchAgreementSDK, Agreement } from "../../lib/sdk-agreement"; // Adjust path as needed

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Circle,
  Search,
  FileText,
  Loader2,
  AlertCircle,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

// --- Interfaces ---
interface AgreementUI {
  id: string; // PDA Address
  title: string;
  description: string;
  type: "professional" | "casual";
  status: "pending" | "active" | "completed" | "closed";
  partner: {
    name: string;
    avatar: string;
    role: "Matcher" | "Matchee";
    publicKey: PublicKey;
  };
  checkpoints: {
    title: string;
    completed: boolean;
  }[];
  isCompleted: boolean;
  isAccepted: boolean;
  matcher: PublicKey;
  matchee: PublicKey;
  contractAddress: string;
}

// --- Helper Functions ---

/**
 * Transforms raw on-chain agreement data into a UI-friendly format.
 * Fetches additional metadata from IPFS.
 */
async function transformAgreementData(
  agreementWithPda: { account: Agreement; publicKey: PublicKey },
  currentUser: PublicKey
): Promise<AgreementUI> {
  const { account, publicKey } = agreementWithPda;

  // --- Mock IPFS Data (replace with real fetch) ---
  // In a real app, you would fetch from `https://gateway.ipfs.io/ipfs/${account.metadataCid}`
  const metadata = {
    title: `Agreement with ${account.matchee.toBase58().substring(0, 6)}...`,
    description: "This is a sample agreement description from mock data.",
    type: "professional" as "professional" | "casual",
    checkpoints: account.checkpointStatus.map((_, i) => ({
      title: `Milestone ${i + 1}`,
    })),
  };

  // Determine partner details
  const isUserTheMatcher = account.matcher.equals(currentUser);
  const partnerPublicKey = isUserTheMatcher ? account.matchee : account.matcher;
  const partnerRole = isUserTheMatcher ? "Matchee" : "Matcher";

  // Determine status
  let status: AgreementUI["status"] = "pending";
  if (account.isClosed) status = "closed";
  else if (account.isCompleted) status = "completed";
  else if (account.isAccepted) status = "active";

  return {
    id: publicKey.toBase58(),
    title: metadata.title,
    description: metadata.description,
    type: metadata.type,
    status,
    partner: {
      name: `Partner (${partnerPublicKey.toBase58().substring(0, 6)}...)`,
      avatar: `/placeholder.svg?height=40&width=40`,
      role: partnerRole,
      publicKey: partnerPublicKey,
    },
    checkpoints: account.checkpointStatus.map(
      (completed: boolean, index: number) => ({
        title: metadata.checkpoints[index]?.title || `Checkpoint ${index + 1}`,
        completed: completed,
      })
    ),
    isCompleted: account.isCompleted,
    isAccepted: account.isAccepted,
    matcher: account.matcher,
    matchee: account.matchee,
    contractAddress: publicKey.toBase58(),
  };
}

// --- Main Component ---

export default function AgreementsPage() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const anchorWallet = useAnchorWallet();

  const [sdk, setSdk] = useState<MatchAgreementSDK | null>(null);
  const [agreements, setAgreements] = useState<AgreementUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize SDK
  useEffect(() => {
    if (connected && connection) {
      try {
        const matchSdk = new MatchAgreementSDK(connection);
        setSdk(matchSdk);
      } catch (err) {
        console.error("Failed to initialize SDK:", err);
        toast.error("Error initializing SDK. Please refresh the page.");
      }
    } else {
      setSdk(null);
    }
  }, [connected, connection]);

  // Fetch agreements from the blockchain
  const fetchAgreements = async () => {
    if (!sdk || !publicKey) return;

    setIsLoading(true);
    setError(null);
    try {
      const onChainAgreements = await sdk.getUserAgreements(publicKey);

      if (!onChainAgreements || onChainAgreements.length === 0) {
        setAgreements([]);
        toast.info("No agreements found for your wallet.");
        return;
      }

      const transformedAgreements = await Promise.all(
        onChainAgreements.map((agreement) =>
          transformAgreementData(agreement, publicKey)
        )
      );

      setAgreements(transformedAgreements);
    } catch (err) {
      console.error("Failed to fetch agreements:", err);
      setError("Could not fetch agreements. Please try again later.");
      toast.error("Could not fetch agreements.");
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to trigger fetching
  useEffect(() => {
    if (sdk && publicKey) {
      fetchAgreements();
    } else if (connected) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
      setAgreements([]);
    }
  }, [sdk, publicKey, connected]);

  // --- Interaction Handlers ---

  const handleToggleCheckpoint = async (
    agreement: AgreementUI,
    checkpointIndex: number
  ) => {
    if (!sdk || !publicKey || !anchorWallet) {
      toast.error("Please connect your wallet first.");
      return;
    }

    if (!agreement.matcher.equals(publicKey)) {
      toast.warning("Only the agreement creator (matcher) can mark checkpoints.");
      return;
    }

    const toastId = toast.loading("Marking checkpoint on-chain...");
    try {
      await sdk.markCheckpointDone(
        anchorWallet,
        agreement.matchee,
        checkpointIndex
      );
      toast.success("Checkpoint marked as done!", { id: toastId });
      await fetchAgreements();
    } catch (error) {
      console.error("Error marking checkpoint:", error);
      toast.error("Failed to mark checkpoint.", { id: toastId });
    }
  };

  // --- Render Logic ---

  if (!isMounted) {
    return null;
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <FileText className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-gray-600 mb-6">
          Please connect your wallet to view and manage your agreements.
        </p>
        <WalletMultiButtonDynamic className="!bg-blue-600 !text-white hover:!bg-blue-700" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2 text-red-600">
          An Error Occurred
        </h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={fetchAgreements}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900">Your Agreements</h1>
        <div className="space-y-4 mt-6">
          {agreements.length > 0 ? (
            agreements.map((agreement) => {
              const completedCheckpoints = agreement.checkpoints.filter(
                (cp) => cp.completed
              ).length;
              const progressPercentage =
                (completedCheckpoints / agreement.checkpoints.length) * 100;
              return (
                <Card
                  key={agreement.id}
                  className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                          {agreement.title}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          With: {agreement.partner.name}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          agreement.status === "active" ? "default" : "secondary"
                        }
                        className={
                          agreement.status === "active"
                            ? "bg-green-100 text-green-800"
                            : ""
                        }
                      >
                        {agreement.status.charAt(0).toUpperCase() +
                          agreement.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          Progress
                        </span>
                        <span className="text-sm text-gray-600">
                          {completedCheckpoints}/{agreement.checkpoints.length}{" "}
                          completed
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                        <Shield className="h-4 w-4 mr-2" />
                        Checkpoints
                      </h4>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {agreement.checkpoints.map((checkpoint, index) => (
                          <div
                            key={index}
                            className={`p-3 border rounded-lg flex items-start space-x-3 ${
                              checkpoint.completed
                                ? "bg-green-50 border-green-200"
                                : "bg-white"
                            }`}
                          >
                            <button
                              onClick={() =>
                                handleToggleCheckpoint(agreement, index)
                              }
                              disabled={
                                checkpoint.completed ||
                                !agreement.matcher.equals(publicKey) ||
                                agreement.status !== "active"
                              }
                              className="flex-shrink-0 mt-1 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {checkpoint.completed ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                              )}
                            </button>
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {checkpoint.title}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No Agreements Found
                </h3>
                <p className="text-sm text-gray-600">
                  You have not created or been invited to any agreements yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}