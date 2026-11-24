"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader, FullScreenLoader } from "@/components/ui/loader";
import { PublicKey } from "@solana/web3.js";
import {
    CheckCircle,
    Circle,
    User,
    Briefcase,
    MapPin,
    Star,
    Zap,
    FileText,
    BitcoinIcon as Blockchain,
    Heart,
    DollarSign,
    Clock,
    Target,
    Shield,
    Sparkles,
    AlertCircle,
} from "lucide-react";
import { generateAgreements } from "./actions"; // Assuming this action exists
import { MatchAgreementSDK, Agreement as SdkAgreement } from "@/lib/sdk-agreement";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";

// --- Interfaces ---
interface UserProfile {
    id: string;
    name: string;
    avatar: string;
    role: string;
    location: string;
    skills: string[];
    experience: string;
    rating: number;
    bio: string;
    publicKey: string;
}

interface AgreementTemplate {
    id: string;
    title: string;
    description: string;
    deliverables: string[];
    timeline: string;
    compensation: string;
    checkpoints: string[];
    type: "professional" | "casual";
    estimatedCost?: string;
}

interface Requirements {
    title: string;
    description: string;
    budget: string;
    timeline: string;
    type: "professional" | "casual";
}

// --- Mock Data ---
const mockMatcher: UserProfile = {
    id: "1",
    name: "Sarah Chen (Matcher)",
    avatar: "/placeholder.svg?height=100&width=100",
    role: "Product Manager",
    location: "San Francisco, CA",
    skills: ["Product Strategy", "User Research", "Agile", "Analytics"],
    experience: "5+ years",
    rating: 4.8,
    publicKey: "587LEdPBaR15ceyDdVvSoiRu5EAiUodt8AoXRuLYWv3A", // Replace with a real public key for testing
    bio: "Experienced product manager looking for technical partnerships to bring innovative ideas to life.",
};

const mockMatched: UserProfile = {
    id: "2",
    name: "Alex Rodriguez (Matchee)",
    avatar: "/placeholder.svg?height=100&width=100",
    role: "Full Stack Developer",
    location: "Austin, TX",
    skills: ["React", "Node.js", "Python", "AWS", "Blockchain"],
    experience: "7+ years",
    rating: 4.9,
    publicKey: "5u2vnCNh7MfPJFhKNpc19X3e9zwBZ6SBYZTrXxQJYZxm", // Replace with a real public key for testing
    bio: "Senior developer passionate about building scalable applications and exploring Web3 technologies.",
};

// --- Component ---
export default function ConnectPage() {
    const [step, setStep] = useState<"requirements" | "agreements" | "blockchain">("requirements");
    const [requirements, setRequirements] = useState<Requirements>({
        title: "",
        description: "",
        budget: "",
        timeline: "",
        type: "professional",
    });
    const [agreements, setAgreements] = useState<AgreementTemplate[]>([]);
    const [selectedAgreement, setSelectedAgreement] = useState<AgreementTemplate | null>(null);
    const [customAgreement, setCustomAgreement] = useState<AgreementTemplate>({
        id: "custom",
        title: "",
        description: "",
        deliverables: [""],
        timeline: "",
        compensation: "",
        checkpoints: ["", "", "", ""],
        type: "professional",
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Blockchain State ---
    const [sdk, setSdk] = useState<MatchAgreementSDK | null>(null);
    const [onChainAgreement, setOnChainAgreement] = useState<SdkAgreement | null>(null);
    const [agreementPDA, setAgreementPDA] = useState<PublicKey | null>(null);
    const [transactionSignature, setTransactionSignature] = useState<string | null>(null);

    const wallet = useAnchorWallet();
    const { connection } = useConnection();

    const matcherPk = useMemo(() => new PublicKey(mockMatcher.publicKey), []);
    const matcheePk = useMemo(() => new PublicKey(mockMatched.publicKey), []);

    useEffect(() => {
        if (connection) {
            setSdk(new MatchAgreementSDK(connection));
        }
    }, [connection]);

    const handleGenerateAgreements = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const generatedAgreements = await generateAgreements({
                matcherProfile: mockMatcher,
                matchedProfile: mockMatched,
                requirements,
            });
            setAgreements(generatedAgreements);
            setStep("agreements");
        } catch (e) {
            console.error("Error generating agreements:", e);
            setError("Failed to generate agreements. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const runTransaction = async (action: () => Promise<string>) => {
        if (!sdk || !wallet) {
            setError("Wallet or SDK not initialized.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setTransactionSignature(null);

        try {
            const sig = await action();
            setTransactionSignature(sig);

            await sdk.confirmTransaction(sig);

            const pda = (await sdk.getAgreementPDA(matcherPk, matcheePk)).publicKey;
            setAgreementPDA(pda);

            const updatedAgreement = await sdk.getAgreement(matcherPk, matcheePk);
            setOnChainAgreement(updatedAgreement);
        } catch (e) {
            console.error(e);
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAgreement = async (agreement: AgreementTemplate) => {
        setSelectedAgreement(agreement);
        setStep("blockchain");

        await runTransaction(async () => {
            if (!sdk || !wallet) throw new Error("SDK or wallet not ready");
            const metadataCid = "Qm...IPFS_CID_Placeholder"; // Placeholder for actual IPFS CID
            console.log("Creating agreement with metadata CID:", metadataCid);
            return sdk.createAgreement(
                wallet,
                matcheePk,
                metadataCid,
                agreement.checkpoints.length
            );
        });
    };

    const handleAcceptAgreement = async () => {
        await runTransaction(async () => {
            if (!sdk || !wallet) throw new Error("SDK or wallet not ready");
            return sdk.acceptAgreement(wallet, matcherPk);
        });
    };

    const handleMarkCheckpoint = async (index: number) => {
        await runTransaction(async () => {
            if (!sdk || !wallet) throw new Error("SDK or wallet not ready");
            return sdk.markCheckpointDone(wallet, matcheePk, index);
        });
    };

    const { completedCheckpoints, progressPercentage, agreementStatus } = useMemo(() => {
        if (!onChainAgreement) {
            return { completedCheckpoints: 0, progressPercentage: 0, agreementStatus: 'Not Deployed' };
        }
        const completed = onChainAgreement.checkpointStatus.filter(Boolean).length;
        const total = onChainAgreement.totalCheckpoints;
        const progress = total > 0 ? (completed / total) * 100 : 0;

        let status = "Pending Acceptance";
        if (onChainAgreement.isClosed) status = "Closed";
        else if (onChainAgreement.isCompleted) status = "Completed";
        else if (onChainAgreement.isAccepted) status = "Active";

        return {
            completedCheckpoints: completed,
            progressPercentage: progress,
            agreementStatus: status
        };
    }, [onChainAgreement]);

    if (isGenerating) {
        return <FullScreenLoader text="Generating agreements..." />;
    }
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium mb-3">
              <Sparkles className="h-3 w-3" />
              <span>AI-Powered Platform</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Connect & Collaborate
            </h1>
            <p className="text-sm text-gray-600 max-w-2xl mx-auto">
              Create intelligent agreements for professional partnerships
            </p>
          </div>
  
          {/* User Profiles */}
          <div className="grid lg:grid-cols-2 gap-4 mb-6">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarImage
                        src={mockMatcher.avatar || "/placeholder.svg"}
                        alt={mockMatcher.name}
                      />
                      <AvatarFallback className="bg-blue-500 text-white text-sm font-medium">
                        {mockMatcher.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                      MATCHER
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                      {mockMatcher.name}
                    </CardTitle>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Briefcase className="h-3 w-3" />
                        <span className="text-sm font-medium">{mockMatcher.role}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{mockMatcher.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span className="text-xs font-medium text-gray-600">{mockMatcher.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  {mockMatcher.bio}
                </p>
                <div className="flex flex-wrap gap-1">
                  {mockMatcher.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs px-2 py-0.5">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
  
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarImage
                        src={mockMatched.avatar || "/placeholder.svg"}
                        alt={mockMatched.name}
                      />
                      <AvatarFallback className="bg-green-500 text-white text-sm font-medium">
                        {mockMatched.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-green-500 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                      MATCHED
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                      {mockMatched.name}
                    </CardTitle>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Briefcase className="h-3 w-3" />
                        <span className="text-sm font-medium">{mockMatched.role}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{mockMatched.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span className="text-xs font-medium text-gray-600">{mockMatched.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  {mockMatched.bio}
                </p>
                <div className="flex flex-wrap gap-1">
                  {mockMatched.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs px-2 py-0.5">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
  
          {/* Tabs */}
          <Tabs value={step} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm border h-10">
              <TabsTrigger value="requirements" disabled={step !== "requirements"} className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 font-medium text-sm h-8">
                <User className="h-3 w-3 mr-2" />
                Requirements
              </TabsTrigger>
              <TabsTrigger value="agreements" disabled={step === "requirements"} className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 font-medium text-sm h-8">
                <Zap className="h-3 w-3 mr-2" />
                Agreements
              </TabsTrigger>
              <TabsTrigger value="blockchain" disabled={!selectedAgreement} className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 font-medium text-sm h-8">
                <Blockchain className="h-3 w-3 mr-2" />
                Deployment
              </TabsTrigger>
            </TabsList>
  
            {/* Requirements Step */}
            <TabsContent value="requirements" className="space-y-4 mt-4">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-gray-900">Choose Collaboration Type</CardTitle>
                  <CardDescription className="text-sm text-gray-600">Select the type of partnership that fits your needs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Card className={`cursor-pointer transition-all duration-200 hover:shadow-sm ${requirements.type === "professional" ? "border-blue-200 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`} onClick={() => setRequirements((prev) => ({ ...prev, type: "professional" }))}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-blue-100 rounded"><DollarSign className="h-4 w-4 text-blue-600" /></div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Professional Partnership</h3>
                            <p className="text-xs text-gray-600">Full collaboration with compensation</p>
                          </div>
                        </div>
                        <ul className="space-y-1 text-xs text-gray-600">
                          <li className="flex items-center space-x-2"><CheckCircle className="h-3 w-3 text-green-500" /><span>Milestone-based payments</span></li>
                          <li className="flex items-center space-x-2"><CheckCircle className="h-3 w-3 text-green-500" /><span>Comprehensive agreements</span></li>
                          <li className="flex items-center space-x-2"><CheckCircle className="h-3 w-3 text-green-500" /><span>Full project management</span></li>
                        </ul>
                      </CardContent>
                    </Card>
                    <Card className={`cursor-pointer transition-all duration-200 hover:shadow-sm ${requirements.type === "casual" ? "border-green-200 bg-green-50" : "border-gray-200 hover:border-gray-300"}`} onClick={() => setRequirements((prev) => ({ ...prev, type: "casual" }))}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-green-100 rounded"><Heart className="h-4 w-4 text-green-600" /></div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Casual Help</h3>
                            <p className="text-xs text-gray-600">Community-driven assistance</p>
                          </div>
                        </div>
                        <ul className="space-y-1 text-xs text-gray-600">
                          <li className="flex items-center space-x-2"><CheckCircle className="h-3 w-3 text-green-500" /><span>Only blockchain fees</span></li>
                          <li className="flex items-center space-x-2"><CheckCircle className="h-3 w-3 text-green-500" /><span>Community reputation</span></li>
                          <li className="flex items-center space-x-2"><CheckCircle className="h-3 w-3 text-green-500" /><span>Flexible commitment</span></li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-gray-900">Project Requirements</CardTitle>
                  <CardDescription className="text-sm text-gray-600">Provide details about your {requirements.type} collaboration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Project Title</label>
                      <Input placeholder="e.g., Mobile App Development" value={requirements.title} onChange={(e) => setRequirements((prev) => ({ ...prev, title: e.target.value }))} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Timeline</label>
                      <Input placeholder="e.g., 3-4 months" value={requirements.timeline} onChange={(e) => setRequirements((prev) => ({ ...prev, timeline: e.target.value }))} className="h-9 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Description</label>
                    <Textarea placeholder="Describe your project goals and requirements..." rows={3} value={requirements.description} onChange={(e) => setRequirements((prev) => ({ ...prev, description: e.target.value }))} className="text-sm resize-none" />
                  </div>
                  {requirements.type === "professional" && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Budget Range</label>
                      <Input placeholder="e.g., $5,000 - $10,000" value={requirements.budget} onChange={(e) => setRequirements((prev) => ({ ...prev, budget: e.target.value }))} className="h-9 text-sm" />
                    </div>
                  )}
                  <Button onClick={handleGenerateAgreements} disabled={!requirements.title || !requirements.description} className="w-full h-9 text-sm font-medium" size="sm">
                    <Zap className="h-3 w-3 mr-2" />
                    Generate Agreements
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
  
            {/* Agreements Step */}
            <TabsContent value="agreements" className="space-y-4 mt-4">
              <div className="text-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">AI-Generated Agreements</h2>
                <p className="text-sm text-gray-600">Choose from suggested agreements or create your own</p>
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                {agreements.map((agreement, index) => (
                  <Card key={agreement.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-base font-semibold text-gray-900 leading-tight">{agreement.title}</CardTitle>
                        <Badge variant="secondary" className={`text-xs ${agreement.type === "casual" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                          {agreement.type === "casual" ? "Casual" : `AI #${index + 1}`}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs text-gray-600 leading-relaxed">{agreement.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center"><Target className="h-3 w-3 mr-1 text-blue-600" />Deliverables</h4>
                        <ul className="space-y-1">
                          {agreement.deliverables.map((deliverable, idx) => (<li key={idx} className="flex items-start space-x-2 text-xs"><CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" /><span className="text-gray-700">{deliverable}</span></li>))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center"><Shield className="h-3 w-3 mr-1 text-blue-600" />Checkpoints</h4>
                        <div className="space-y-1">
                          {agreement.checkpoints.map((checkpoint, idx) => (<div key={idx} className="flex items-start space-x-2 text-xs"><div className="h-3 w-3 border border-gray-300 rounded-full mt-0.5 flex-shrink-0" /><span className="text-gray-600">{checkpoint}</span></div>))}
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center space-x-1 mb-1"><Clock className="h-3 w-3 text-gray-500" /><span className="text-xs font-semibold text-gray-900">Timeline</span></div>
                          <p className="text-xs text-gray-600">{agreement.timeline}</p>
                        </div>
                        <div>
                          <div className="flex items-center space-x-1 mb-1"><DollarSign className="h-3 w-3 text-gray-500" /><span className="text-xs font-semibold text-gray-900">{agreement.type === "casual" ? "Cost" : "Payment"}</span></div>
                          <p className="text-xs text-gray-600">{agreement.type === "casual" ? agreement.estimatedCost || "Blockchain fees only" : agreement.compensation}</p>
                        </div>
                      </div>
                      <Button onClick={() => handleSelectAgreement(agreement)} className="w-full h-8 text-xs font-medium" size="sm" disabled={!sdk || !wallet?.publicKey}>
                        {!sdk || !wallet?.publicKey ? "Connect Wallet to Proceed" : "Select Agreement"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="border-2 border-dashed border-gray-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base font-semibold"><FileText className="h-4 w-4 text-gray-600" /><span>Create Custom Agreement</span></CardTitle>
                  <CardDescription className="text-sm">Design your own agreement terms</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input placeholder="Agreement Title" value={customAgreement.title} onChange={(e) => setCustomAgreement((prev) => ({ ...prev, title: e.target.value }))} className="h-8 text-sm" />
                    <Input placeholder="Timeline" value={customAgreement.timeline} onChange={(e) => setCustomAgreement((prev) => ({ ...prev, timeline: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <Textarea placeholder="Agreement Description" value={customAgreement.description} onChange={(e) => setCustomAgreement((prev) => ({ ...prev, description: e.target.value }))} rows={2} className="text-sm" />
                  <Input placeholder="Compensation" value={customAgreement.compensation} onChange={(e) => setCustomAgreement((prev) => ({ ...prev, compensation: e.target.value }))} className="h-8 text-sm" />
                  <Button onClick={() => handleSelectAgreement(customAgreement)} disabled={!customAgreement.title || !customAgreement.description || !sdk || !wallet?.publicKey} variant="outline" className="w-full h-8 text-xs font-medium" size="sm">
                    {!sdk || !wallet?.publicKey ? "Connect Wallet to Proceed" : "Use Custom Agreement"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
  
            {/* Blockchain Step */}
            <TabsContent value="blockchain" className="space-y-4 mt-4">
              {isLoading && <FullScreenLoader text="Processing transaction..." />}
              {selectedAgreement && !isLoading && (
                <>
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-lg font-semibold"><Blockchain className="h-4 w-4 text-blue-600" /><span>Blockchain Deployment</span></CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-4 mb-4">
                        <div className={`h-3 w-3 rounded-full ${agreementStatus === 'Active' ? 'bg-green-500' : agreementStatus === 'Completed' ? 'bg-blue-500' : agreementStatus === 'Pending Acceptance' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`} />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">Status: {agreementStatus}</span>
                        </div>
                      </div>
                      {transactionSignature && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs space-y-1">
                          <p><strong>Last Tx Signature:</strong> <a href={`https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-blue-600 break-all">{transactionSignature}</a></p>
                          {agreementPDA && <p><strong>Agreement Address:</strong> <a href={`https://explorer.solana.com/address/${agreementPDA.toBase58()}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-blue-600 break-all">{agreementPDA.toBase58()}</a></p>}
                        </div>
                      )}
                      {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 mt-2 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2" />{error}
                        </div>
                      )}
                    </CardContent>
                  </Card>
  
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold text-gray-900">{selectedAgreement.title}</CardTitle>
                      <CardDescription className="text-sm">{selectedAgreement.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid lg:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center"><Target className="h-3 w-3 mr-1 text-blue-600" />Deliverables</h4>
                          <ul className="space-y-1">
                            {selectedAgreement.deliverables.map((deliverable, idx) => (<li key={idx} className="flex items-start space-x-2"><CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" /><span className="text-xs text-gray-700">{deliverable}</span></li>))}
                          </ul>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center space-x-1 mb-1"><Clock className="h-3 w-3 text-gray-500" /><span className="text-xs font-semibold text-gray-900">Timeline</span></div>
                            <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded">{selectedAgreement.timeline}</p>
                          </div>
                          <div>
                            <div className="flex items-center space-x-1 mb-1"><DollarSign className="h-3 w-3 text-gray-500" /><span className="text-xs font-semibold text-gray-900">{selectedAgreement.type === "casual" ? "Cost" : "Payment"}</span></div>
                            <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded">{selectedAgreement.type === "casual" ? selectedAgreement.estimatedCost || "Blockchain fees only" : selectedAgreement.compensation}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
  
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center"><Shield className="h-4 w-4 mr-2 text-blue-600" />Project Checkpoints</CardTitle>
                      <CardDescription className="text-sm">Track progress through key milestones. Milestones can be marked as complete by the Matcher once the agreement is active.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {agreementStatus === 'Pending Acceptance' && (
                          <Button onClick={handleAcceptAgreement} disabled={isLoading || !wallet || wallet.publicKey.toBase58() !== matcheePk.toBase58()}>
                            {isLoading ? "Processing..." : `Accept Agreement (as ${mockMatched.name})`}
                          </Button>
                      )}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">Progress</span>
                          <span className="text-sm font-semibold text-blue-600">{completedCheckpoints}/{onChainAgreement?.totalCheckpoints || selectedAgreement.checkpoints.length} completed</span>
                        </div>
                        <Progress value={progressPercentage} className="h-2" />
                        <p className="text-xs text-gray-600 mt-1">{progressPercentage.toFixed(0)}% complete</p>
                      </div>
                      <div className="space-y-3">
                        {selectedAgreement.checkpoints.map((checkpoint, index) => {
                          const isDone = onChainAgreement?.checkpointStatus[index] ?? false;
                          return (
                            <div key={index} className={`p-3 border rounded-lg transition-colors ${isDone ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"}`}>
                              <div className="flex items-start space-x-3">
                                <button onClick={() => handleMarkCheckpoint(index)} className="flex-shrink-0 mt-0.5 transition-transform hover:scale-110" disabled={isDone || isLoading || agreementStatus !== 'Active' || !wallet || wallet.publicKey.toBase58() !== matcherPk.toBase58()}>
                                  {isDone ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-gray-400 hover:text-gray-600" />}
                                </button>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-sm font-medium text-gray-900">Checkpoint {index + 1}</h4>
                                    <Badge variant={isDone ? "default" : "secondary"} className={`text-xs ${isDone ? "bg-green-500" : ""}`}>{isDone ? "Done" : "Pending"}</Badge>
                                  </div>
                                  <p className="text-xs text-gray-700 leading-relaxed">{checkpoint}</p>
                                  {isDone && <p className="text-xs text-green-600 mt-1 font-medium">✓ Verified on blockchain</p>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {agreementStatus === "Completed" && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                          <div className="text-2xl mb-2">🎉</div>
                          <h3 className="text-sm font-semibold text-green-800 mb-1">Project Completed!</h3>
                          <p className="text-xs text-green-700">All checkpoints verified on blockchain</p>
                          <div className="mt-2 p-2 bg-white rounded text-xs text-green-600 font-mono break-all">Hash: {transactionSignature}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );}