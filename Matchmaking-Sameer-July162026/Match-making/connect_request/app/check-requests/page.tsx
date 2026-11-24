"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useSolanaProgram } from "@/lib/use-solana-program"
import { getCid, getDataFromCid } from "@/lib/ipfs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, DollarSign, Calendar, MessageSquare, Check, X, Users, RefreshCw } from "lucide-react"
import Link from "next/link"
import { getRequestPDA } from "@/lib/solana-program"

// Demo data for testing UI (will be hidden when real data is available)
const demoConnectionRequests = [
  {
    id: 1,
    from: {
      name: "Emma Wilson",
      title: "DeFi Protocol Founder",
      company: "YieldMax",
      avatar: "",
    },
    purpose: "Project Collaboration",
    collaboration: "Smart contract security audit for our new lending protocol",
    timeline: "Short-term (1-3 months)",
    compensation: "$15,000 USDC + 0.5% token allocation",
    message:
      "Hi! I'm Emma, founder of YieldMax, a new DeFi lending protocol. We're looking for a security expert to audit our smart contracts before mainnet launch. Your experience with DeFi audits makes you perfect for this. We have $2M in funding and are backed by top VCs. This could lead to ongoing security consulting opportunities.",
    timestamp: "2 hours ago",
    status: "pending",
  }
]

// Type definitions
type ConnectionRequestType = {
  id: number | bigint
  from?: {
    name: string
    title: string
    company: string
    avatar: string
  }
  purpose?: string
  collaboration?: string
  timeline?: string
  compensation?: string
  message?: string
  timestamp?: string
  status: string | number
  senderAddress?: string
  requestId?: bigint
  // Blockchain request properties
  sender?: any
  receiver?: any
  sender_message?: string
  receiver_message?: string
  sender_approved?: boolean
  receiver_approved?: boolean
  created_at?: bigint
  updated_at?: bigint
  receiver_needs_cid?: string | null
}

export default function CheckRequestsPage() {
  const [selectedRequest, setSelectedRequest] = useState<ConnectionRequestType | null>(null)
  const [response, setResponse] = useState({
    availability: "",
    rate: "",
    timeline: "",
    conditions: "",
    message: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [sentRequests, setSentRequests] = useState<any[]>([])
  const [receivedRequests, setReceivedRequests] = useState<any[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cidDataCache, setCidDataCache] = useState<Record<string, any>>({})

  const { 
    getAllRequests, 
    connected, 
    respondToRequest, 
    rejectRequest, 
    publicKey, 
    RequestStatus, 
    finalApproval 
  } = useSolanaProgram()

  useEffect(() => {
    if (connected && publicKey) {
      loadUserRequests()
    }
  }, [connected, publicKey])

  const loadUserRequests = async () => {
    if (!publicKey || !connected) {
      console.log("❌ Cannot load requests - wallet not connected")
      return
    }
    
    setIsLoadingRequests(true)
    setError(null)
    
    try {
      console.log("🔍 Loading requests for user:", publicKey.toBase58())
      
      const { deserializedForSenders, deserializedForRecievers } = await getAllRequests(publicKey)
      
      console.log("📤 Sent requests:", deserializedForSenders)
      console.log("📥 Received requests:", deserializedForRecievers)
      
      setSentRequests(deserializedForSenders || [])
      setReceivedRequests(deserializedForRecievers || [])
      
    } catch (error) {
      console.error("❌ Error loading requests:", error)
      setError("Failed to load requests. Please try again.")
      setSentRequests([])
      setReceivedRequests([])
    } finally {
      setIsLoadingRequests(false)
    }
  }

  const resetForm = () => {
    setResponse({
      availability: "",
      rate: "",
      timeline: "",
      conditions: "",
      message: "",
    })
    setSelectedRequest(null)
  }

  const handleRespondToBlockchainRequest = async (request: any, approve: boolean, responseMessage?: string) => {
    console.log("🔥 handleRespondToBlockchainRequest called with:", {
      requestId: request.id?.toString(),
      sender: request.sender?.toBase58(),
      approve,
      responseMessage,
      connected,
      publicKey: publicKey?.toBase58()
    })

    if (!connected || !publicKey) {
      console.error("❌ Wallet not connected")
      alert("Please connect your wallet first!")
      return
    }

    if (!request.sender || !request.id) {
      console.error("❌ Invalid request data:", request)
      alert("Invalid request data!")
      return
    }

    try {
      setIsLoading(true)
      console.log("⏳ Starting request response process...")
      
      let responseCid = null
      
      // Only create response CID if approving and we have response data
      if (approve && (response.availability || response.rate || response.timeline || response.conditions)) {
        console.log("📄 Creating IPFS CID for response data...")
        const responseData = {
          availability: response.availability,
          rate: response.rate,
          timeline: response.timeline,
          conditions: response.conditions,
        }
        
        try {
          responseCid = await getCid(responseData)
          console.log("✅ IPFS CID created successfully:", responseCid)
        } catch (cidError) {
          console.error("⚠️ Failed to create CID, continuing without:", cidError)
          // Continue without CID if IPFS fails
        }
      }

      const message = responseMessage || response.message || (approve ? "Request accepted" : "Request declined")
      
      if (!message.trim()) {
        alert("Please provide a response message")
        return
      }

      console.log("📨 Calling respondToRequest with params:", {
        senderAddress: request.sender.toBase58(),
        requestId: request.id.toString(),
        responseCid,
        approve,
        message
      })

      const signature = await respondToRequest(
        request.sender.toBase58(),
        request.id,
        responseCid,
        approve,
        message
      )
      
      console.log("✅ Transaction successful:", signature)
      alert(`Request ${approve ? 'accepted' : 'declined'} successfully!`)
      
      // Reset form and immediately update local state
      resetForm()
      
      // Update local state immediately for better UX
      if (approve) {
        // Move request to negotiating status if approved
        setReceivedRequests(prev => 
          prev.map(r => 
            r.id === request.id 
              ? { ...r, status: RequestStatus?.Negotiating ?? 1, receiver_message: message }
              : r
          )
        )
      } else {
        // Remove request if declined
        setReceivedRequests(prev => prev.filter(r => r.id !== request.id))
      }
      
      // Also refresh from blockchain after a delay
      setTimeout(() => {
        loadUserRequests()
      }, 2000)
      
    } catch (error) {
      console.error("❌ Error responding to request:", error)
      alert(`Error responding to request: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

 const handleRejectBlockchainRequest = async (request: any) => {
  console.log("🚫 handleRejectBlockchainRequest called with:", {
    requestId: request.id?.toString(),
    sender: request.sender?.toBase58(),
    receiver: request.receiver?.toBase58(),
    connectedWallet: publicKey?.toBase58(),
    requestStatus: request.status
  })

  if (!connected || !publicKey) {
    console.error("❌ Wallet not connected")
    alert("Please connect your wallet first!")
    return
  }

  if (!request.sender || !request.receiver || !request.id) {
    console.error("❌ Invalid request data:", {
      hasSender: !!request.sender,
      hasReceiver: !!request.receiver,
      hasId: !!request.id,
      request
    })
    alert("Invalid request data - missing required fields!")
    return
  }

  // CRITICAL FIX: Determine if current user is receiver or sender
  const isReceiver = request.receiver.equals(publicKey)
  const isSender = request.sender.equals(publicKey)
  
  if (!isReceiver && !isSender) {
    console.error("❌ Current user is neither sender nor receiver:", {
      currentUser: publicKey.toBase58(),
      requestSender: request.sender.toBase58(),
      requestReceiver: request.receiver.toBase58()
    })
    alert("You are not authorized to reject this request!")
    return
  }

  // Determine the other party
  const otherParty = isReceiver ? request.sender : request.receiver
  
  console.log("✅ Rejection authorization verified:", {
    isReceiver,
    isSender,
    otherParty: otherParty.toBase58()
  })

  try {
    setIsLoading(true)

    // FIXED: Pre-flight validation - check if request exists and can be rejected
    const [requestPDA] = getRequestPDA(
      isReceiver ? request.sender : publicKey,
      isReceiver ? publicKey : request.receiver,
      request.id
    )
    
    console.log("🔍 Pre-flight validation:", {
      requestPDA: requestPDA.toBase58(),
      currentStatus: request.status,
      canReject: request.status !== RequestStatus?.Rejected && request.status !== RequestStatus?.Cancelled
    })

    // Validate request can be rejected
    if (request.status === RequestStatus?.Rejected) {
      alert("This request has already been rejected!")
      return
    }

    if (request.status === RequestStatus?.Cancelled) {
      alert("This request has already been cancelled!")
      return
    }

    console.log("🔧 Creating reject instruction...")
    const signature = await rejectRequest(
      otherParty.toBase58(),
      request.id,
      isReceiver
    )
    
    console.log("✅ Rejection transaction successful:", signature)
    alert("Request rejected successfully!")
    
    // FIXED: Update local state immediately with proper status
    const rejectedStatus = RequestStatus?.Rejected ?? 3
    const now = BigInt(Math.floor(Date.now() / 1000))
    
    // Update the request in both arrays (in case it appears in both)
    const updateRequest = (r: any) => 
      r.id === request.id 
        ? { ...r, status: rejectedStatus, updated_at: now }
        : r
    
    setReceivedRequests(prev => prev.map(updateRequest))
    setSentRequests(prev => prev.map(updateRequest))
    
    // Refresh from blockchain after delay
    setTimeout(() => {
      console.log("🔄 Refreshing requests from blockchain...")
      loadUserRequests()
    }, 3000)
    
  } catch (error) {
    console.error("❌ Error rejecting request:", error)
    
    // ENHANCED: Better error message parsing
    let errorMessage = "Unknown error occurred"
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Parse specific Solana/wallet errors
      if (error.name === 'WalletSendTransactionError') {
        errorMessage = `Transaction failed: ${error.message}`
      } else if (error.message.includes('User rejected')) {
        errorMessage = "Transaction was cancelled by user"
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = "Insufficient SOL for transaction fees"
      } else if (error.message.includes('Transaction simulation failed')) {
        errorMessage = "Transaction simulation failed - request may be invalid"
      } else if (error.message.includes('Request PDA mismatch')) {
        errorMessage = "Request not found or access denied"
      } else if (error.message.includes('Unauthorized')) {
        errorMessage = "You don't have permission to reject this request"
      } else if (error.message.includes('already rejected')) {
        errorMessage = "This request has already been rejected"
      }
    }
    
    console.error("📋 Formatted error message:", errorMessage)
    alert(`Failed to reject request: ${errorMessage}`)
    
  } finally {
    setIsLoading(false)
  }
}

  const handleFinalApproval = async (request: any, approve: boolean) => {
    if (!connected || !publicKey) {
      alert("Please connect your wallet first!")
      return
    }

    if (!request.receiver || !request.id) {
      console.error("❌ Invalid request data for final approval:", request)
      alert("Invalid request data!")
      return
    }

    try {
      setIsLoading(true)

      const signature = await finalApproval(
        request.receiver.toBase58(),
        request.id,
        approve
      )
      
      alert(`Final ${approve ? 'approval' : 'rejection'} completed!`)
      
      await loadUserRequests()
    } catch (error) {
      console.error("Error with final approval:", error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: number) => {
    switch (status) {
      case RequestStatus?.Pending ?? 0:
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>
      case RequestStatus?.Negotiating ?? 1:
        return <Badge className="bg-blue-500 text-white">Negotiating</Badge>
      case RequestStatus?.Approved ?? 2:
        return <Badge className="bg-green-500 text-white">Approved</Badge>
      case RequestStatus?.Rejected ?? 3:
        return <Badge className="bg-red-500 text-white">Rejected</Badge>
      case RequestStatus?.Cancelled ?? 4:
        return <Badge className="bg-gray-500 text-white">Cancelled</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const formatTimestamp = (timestamp: bigint) => {
    try {
      const date = new Date(Number(timestamp) * 1000)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
    } catch {
      return 'Invalid date'
    }
  }

  const decodeCidData = async (cid: string | null) => {
    if (!cid) return null
    
    // Check cache first
    if (cidDataCache[cid]) {
      return cidDataCache[cid]
    }

    try {
      console.log("📥 Attempting to decode CID data:", cid)
      
      try {
        const ipfsData = await getDataFromCid(cid)
        console.log("✅ Retrieved data from IPFS:", ipfsData)
        // Cache the result
        setCidDataCache(prev => ({ ...prev, [cid]: ipfsData }))
        return ipfsData
      } catch (ipfsError) {
        console.log("⚠️ IPFS retrieval failed, trying Base64 fallback:", ipfsError)
        
        try {
          const decodedData = JSON.parse(atob(cid))
          console.log("✅ Decoded Base64 data:", decodedData)
          setCidDataCache(prev => ({ ...prev, [cid]: decodedData }))
          return decodedData
        } catch (base64Error) {
          console.error("❌ Both IPFS and Base64 decode failed:", base64Error)
          return null
        }
      }
    } catch (error) {
      console.error("❌ Error decoding CID data:", error)
      return null
    }
  }

  // Load CID data when requests change
  useEffect(() => {
    const loadCidData = async () => {
      const allRequests = [...receivedRequests, ...sentRequests]
      for (const request of allRequests) {
        if (request.receiver_needs_cid && !cidDataCache[request.receiver_needs_cid]) {
          await decodeCidData(request.receiver_needs_cid)
        }
      }
    }

    loadCidData()
  }, [receivedRequests, sentRequests])

  const CidDataDisplay = ({ cid }: { cid: string | null }) => {
    if (!cid) return null

    const cidData = cidDataCache[cid]
    if (!cidData) {
      return (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm font-medium text-blue-800 mb-2">📄 Loading response terms...</div>
        </div>
      )
    }

    return (
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="text-sm font-medium text-blue-800 mb-2">📄 Response Terms</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {cidData.availability && (
            <div>
              <span className="font-medium text-blue-700">Availability:</span>
              <p className="text-blue-600">{cidData.availability}</p>
            </div>
          )}
          {cidData.rate && (
            <div>
              <span className="font-medium text-blue-700">Rate/Terms:</span>
              <p className="text-blue-600">{cidData.rate}</p>
            </div>
          )}
          {cidData.timeline && (
            <div>
              <span className="font-medium text-blue-700">Timeline:</span>
              <p className="text-blue-600">{cidData.timeline}</p>
            </div>
          )}
          {cidData.conditions && (
            <div>
              <span className="font-medium text-blue-700">Conditions:</span>
              <p className="text-blue-600">{cidData.conditions}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const BlockchainRequestCard = ({ 
    request, 
    isReceiver, 
    onRespond, 
    onReject, 
    onApprove, 
    isLoading, 
    connected 
  }: {
    request: any
    isReceiver: boolean
    onRespond?: () => void
    onReject?: () => void
    onApprove?: (approve: boolean) => void
    isLoading: boolean
    connected: boolean
  }) => (
    <Card className="hover:shadow-lg transition-all duration-300 border-2 border-green-200 bg-green-50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12">
              <AvatarFallback>
                {isReceiver 
                  ? request.sender?.toBase58().slice(0, 2).toUpperCase()
                  : request.receiver?.toBase58().slice(0, 2).toUpperCase()
                }
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {isReceiver ? 'From' : 'To'}: {isReceiver 
                  ? request.sender?.toBase58().slice(0, 8) + '...'
                  : request.receiver?.toBase58().slice(0, 8) + '...'
                }
              </CardTitle>
              <CardDescription>
                Request ID: {request.id?.toString()}
              </CardDescription>
              <div className="mt-2">
                {getStatusBadge(request.status)}
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatTimestamp(request.created_at)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">Sender Message</div>
          <p className="text-sm text-gray-600">{request.sender_message || "No message provided"}</p>
        </div>

        {request.receiver_message && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Receiver Response</div>
            <p className="text-sm text-gray-600">{request.receiver_message}</p>
          </div>
        )}

        <CidDataDisplay cid={request.receiver_needs_cid} />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Sender Approved:</span>{" "}
            <span className={request.sender_approved ? "text-green-600" : "text-red-600"}>
              {request.sender_approved ? "Yes" : "No"}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Receiver Approved:</span>{" "}
            <span className={request.receiver_approved ? "text-green-600" : "text-red-600"}>
              {request.receiver_approved ? "Yes" : "No"}
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          {isReceiver && request.status === (RequestStatus?.Pending ?? 0) && (
            <>
              <Button 
                onClick={onRespond} 
                disabled={!connected || isLoading} 
                className="bg-green-600 hover:bg-green-700"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                {isLoading ? "Processing..." : "Respond"}
              </Button>
              <Button 
                variant="outline" 
                onClick={onReject} 
                disabled={!connected || isLoading}
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </>
          )}

          {!isReceiver && request.status === (RequestStatus?.Negotiating ?? 1) && (
            <>
              <Button 
                onClick={() => onApprove?.(true)} 
                disabled={!connected || isLoading} 
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-5 h-5 mr-2" />
                {isLoading ? "Processing..." : "Accept Terms"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onApprove?.(false)} 
                disabled={!connected || isLoading}
              >
                <X className="w-4 h-4 mr-1" />
                Reject Terms
              </Button>
            </>
          )}

          {request.status === (RequestStatus?.Approved ?? 2) && (
            <Badge className="bg-green-100 text-green-800">✅ Connection Established</Badge>
          )}

          {request.status === (RequestStatus?.Rejected ?? 3) && (
            <Badge className="bg-red-100 text-red-800">❌ Request Rejected</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const hasRealData = connected && !isLoadingRequests && !error && (sentRequests.length > 0 || receivedRequests.length > 0)

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Connection Requests</h1>
            <p className="text-gray-600 mt-2">Review and manage your connection requests</p>
          </div>
          <div className="flex gap-2">
            {connected && (
              <Button onClick={loadUserRequests} variant="outline" size="lg" disabled={isLoadingRequests}>
                <RefreshCw className={`w-5 h-5 mr-2 ${isLoadingRequests ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
            <Link href="/connect">
              <Button variant="outline" size="lg">
                <Users className="w-5 h-5 mr-2" />
                Find Connections
              </Button>
            </Link>
          </div>
        </div>

        {/* Wallet Connection Status */}
        {!connected && (
          <Card className="mb-6 bg-yellow-50 border-yellow-200">
            <CardContent className="text-center py-6">
              <p className="text-yellow-700">
                🔌 Please connect your Solana wallet to view your connection requests
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoadingRequests && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="text-center py-6">
              <p className="text-blue-700">🔄 Loading your connection requests...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <CardContent className="text-center py-6">
              <p className="text-red-700">❌ {error}</p>
              <Button onClick={loadUserRequests} className="mt-2">Try Again</Button>
            </CardContent>
          </Card>
        )}

        {/* Real Data Summary */}
        {hasRealData && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">📡 Your Connection Requests</CardTitle>
              <CardDescription className="text-blue-700">
                Data from Solana blockchain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-900">Received Requests:</span>{" "}
                  <span className="text-blue-800">{receivedRequests.length}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Sent Requests:</span>{" "}
                  <span className="text-blue-800">{sentRequests.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Data State */}
        {connected && !isLoadingRequests && !error && sentRequests.length === 0 && receivedRequests.length === 0 && (
          <Card className="mb-6 bg-yellow-50 border-yellow-200">
            <CardContent className="text-center py-6">
              <p className="text-yellow-700">
                ✨ No connection requests found. Send a connection request to get started!
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="received" className="space-y-6">
          <TabsList>
            <TabsTrigger value="received">
              Received ({receivedRequests.filter((r) => r.status === (RequestStatus?.Pending ?? 0)).length})
            </TabsTrigger>
            <TabsTrigger value="sent">
              Sent ({sentRequests.length})
            </TabsTrigger>
            <TabsTrigger value="negotiating">
              Negotiating ({[...receivedRequests, ...sentRequests].filter((r) => r.status === (RequestStatus?.Negotiating ?? 1)).length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({[...receivedRequests, ...sentRequests].filter((r) => r.status === (RequestStatus?.Approved ?? 2)).length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({[...receivedRequests, ...sentRequests].filter((r) => r.status === (RequestStatus?.Rejected ?? 3)).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-4">
            {receivedRequests
              .filter((request) => request.status === (RequestStatus?.Pending ?? 0))
              .map((request) => (
                <BlockchainRequestCard
                  key={`received-${request.id}`}
                  request={request}
                  isReceiver={true}
                  onRespond={() => setSelectedRequest(request)}
                  onReject={() => handleRejectBlockchainRequest(request)}
                  isLoading={isLoading}
                  connected={connected}
                />
              ))}

            {/* Show demo requests only if no real data */}
            {!hasRealData && demoConnectionRequests
              .filter((r) => r.status === "pending")
              .map((request) => (
                <Card
                  key={`demo-${request.id}`}
                  className="hover:shadow-xl transition-all duration-300 border-2 border-purple-200 bg-purple-50"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback>
                            {request.from.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{request.from.name}</CardTitle>
                          <CardDescription>
                            {request.from.title} at {request.from.company}
                          </CardDescription>
                          <Badge variant="outline" className="mt-1">Demo Data</Badge>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {request.timestamp}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-700">Purpose</div>
                        <Badge variant="outline">{request.purpose}</Badge>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">Timeline</div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {request.timeline}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">Compensation</div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <DollarSign className="w-4 h-4" />
                          {request.compensation}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Message</div>
                      <p className="text-sm text-gray-600 line-clamp-3">{request.message}</p>
                    </div>

                    <div className="text-center text-sm text-gray-500 p-2 bg-gray-100 rounded">
                      Connect your wallet to interact with real requests
                    </div>
                  </CardContent>
                </Card>
              ))}

            {receivedRequests.filter((r) => r.status === (RequestStatus?.Pending ?? 0)).length === 0 && hasRealData && (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">No pending received requests.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            {sentRequests.map((request) => (
              <BlockchainRequestCard
                key={`sent-${request.id}`}
                request={request}
                isReceiver={false}
                onApprove={(approve) => handleFinalApproval(request, approve)}
                isLoading={isLoading}
                connected={connected}
              />
            ))}

            {sentRequests.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">No sent requests.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="negotiating" className="space-y-4">
            {[...receivedRequests, ...sentRequests]
              .filter((request) => request.status === (RequestStatus?.Negotiating ?? 1))
              .map((request) => {
                const isReceiver = receivedRequests.includes(request)
                return (
                  <BlockchainRequestCard
                    key={`negotiating-${request.id}`}
                    request={request}
                    isReceiver={isReceiver}
                    onApprove={!isReceiver ? (approve) => handleFinalApproval(request, approve) : undefined}
                    isLoading={isLoading}
                    connected={connected}
                  />
                )
              })}

            {[...receivedRequests, ...sentRequests].filter((r) => r.status === (RequestStatus?.Negotiating ?? 1)).length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">No negotiating requests.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {[...receivedRequests, ...sentRequests]
              .filter((request) => request.status === (RequestStatus?.Approved ?? 2))
              .map((request) => {
                const isReceiver = receivedRequests.includes(request)
                return (
                  <BlockchainRequestCard
                    key={`approved-${request.id}`}
                    request={request}
                    isReceiver={isReceiver}
                    isLoading={isLoading}
                    connected={connected}
                  />
                )
              })}

            {[...receivedRequests, ...sentRequests].filter((r) => r.status === (RequestStatus?.Approved ?? 2)).length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">No approved requests yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {[...receivedRequests, ...sentRequests]
              .filter((request) => request.status === (RequestStatus?.Rejected ?? 3))
              .map((request) => {
                const isReceiver = receivedRequests.includes(request)
                return (
                  <BlockchainRequestCard
                    key={`rejected-${request.id}`}
                    request={request}
                    isReceiver={isReceiver}
                    isLoading={isLoading}
                    connected={connected}
                  />
                )
              })}

            {[...receivedRequests, ...sentRequests].filter((r) => r.status === (RequestStatus?.Rejected ?? 3)).length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">No rejected requests.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Response Dialog */}
        {selectedRequest && typeof selectedRequest.id === 'bigint' && (
          <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback>
                      {selectedRequest.sender?.toBase58().slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">Respond to Connection Request</h2>
                    <p className="text-gray-600">
                      From: {selectedRequest.sender?.toBase58().slice(0, 8)}...
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Request Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div>
                      <span className="font-medium">Request ID:</span> {selectedRequest.id?.toString()}
                    </div>
                    <div>
                      <span className="font-medium">Sender Message:</span>
                      <p className="text-gray-600 mt-1">{selectedRequest.sender_message || "No message provided"}</p>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {getStatusBadge(typeof selectedRequest.status === 'number' ? selectedRequest.status : 0)}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Your Response</h3>

                  <div>
                    <Label htmlFor="availability">Your Availability</Label>
                    <Select onValueChange={(value) => setResponse({ ...response, availability: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select availability" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Available immediately</SelectItem>
                        <SelectItem value="1week">Available in 1 week</SelectItem>
                        <SelectItem value="2weeks">Available in 2 weeks</SelectItem>
                        <SelectItem value="1month">Available in 1 month</SelectItem>
                        <SelectItem value="flexible">Flexible timeline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="rate">Your Rate/Terms</Label>
                    <Input
                      placeholder="e.g., $200/hour, $10,000 fixed, 2% equity..."
                      value={response.rate}
                      onChange={(e) => setResponse({ ...response, rate: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="timeline">Preferred Timeline</Label>
                    <Input
                      placeholder="e.g., 2-3 weeks, 1 month, ongoing..."
                      value={response.timeline}
                      onChange={(e) => setResponse({ ...response, timeline: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="conditions">Conditions/Requirements</Label>
                    <Textarea
                      placeholder="Any specific conditions, requirements, or expectations..."
                      rows={3}
                      value={response.conditions}
                      onChange={(e) => setResponse({ ...response, conditions: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Response Message *</Label>
                    <Textarea
                      placeholder="Your response to their request... (Required)"
                      rows={4}
                      value={response.message}
                      onChange={(e) => setResponse({ ...response, message: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={() => handleRespondToBlockchainRequest(selectedRequest, true)} 
                      className="flex-1"
                      disabled={!connected || isLoading || !response.message.trim()}
                    >
                      <Check className="w-5 h-5 mr-2" />
                      {isLoading ? "Processing..." : "Accept & Send Terms"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRespondToBlockchainRequest(selectedRequest, false, "Request declined")}
                      className="flex-1"
                      disabled={!connected || isLoading}
                    >
                      <X className="w-5 h-5 mr-2" />
                      {isLoading ? "Processing..." : "Decline"}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
