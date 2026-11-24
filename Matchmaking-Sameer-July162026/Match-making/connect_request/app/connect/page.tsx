"use client"

import { useState } from "react"
import { PublicKey } from "@solana/web3.js"
import { Button } from "@/components/ui/button"
import { useSolanaProgram } from "@/lib/use-solana-program"
import { getCid } from "@/lib/ipfs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Star, Users, MessageCircle, Send } from "lucide-react"
import Link from "next/link"

const users = [
  {
    id: 1,
    name: "Alex Chen",
    title: "Smart Contract Developer",
    company: "DeFi Labs",
    location: "San Francisco, CA",
    rating: 4.9,
    connections: 234,
    avatar: "",
    skills: ["Solidity", "Web3.js", "DeFi", "Smart Contracts"],
    bio: "Experienced smart contract developer with 5+ years in DeFi. Built protocols handling $100M+ TVL.",
    experience: "Senior Developer at DeFi Labs, Previously at Compound Protocol",
    projects: ["DeFi Yield Optimizer", "Cross-chain Bridge", "NFT Marketplace"],
  },
  {
    id: 2,
    name: "Sarah Johnson",
    title: "Blockchain Product Manager",
    company: "Web3 Ventures",
    location: "New York, NY",
    rating: 4.8,
    connections: 456,
    avatar: "",
    skills: ["Product Strategy", "Tokenomics", "Community Building", "Go-to-Market"],
    bio: "Product leader specializing in Web3 consumer applications and tokenomics design.",
    experience: "Head of Product at Web3 Ventures, Former PM at Coinbase",
    projects: ["Social Token Platform", "DAO Governance Tool", "Web3 Gaming Platform"],
  },
  {
    id: 3,
    name: "Marcus Rodriguez",
    title: "Blockchain Security Auditor",
    company: "SecureChain",
    location: "Austin, TX",
    rating: 5.0,
    connections: 189,
    avatar: "",
    skills: ["Security Auditing", "Penetration Testing", "Formal Verification", "Risk Assessment"],
    bio: "Security expert with 200+ smart contract audits. Specialized in DeFi and NFT security.",
    experience: "Lead Auditor at SecureChain, Former Security Researcher at Trail of Bits",
    projects: ["Multi-sig Wallet Audit", "DeFi Protocol Security Review", "NFT Marketplace Audit"],
  },
]

// Add type for user
type User = {
  id: number
  name: string
  title: string
  company: string
  location: string
  rating: number
  connections: number
  avatar: string
  skills: string[]
  bio: string
  experience: string
  projects: string[]
  walletAddress?: string
}

export default function ConnectPage() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [connectionRequest, setConnectionRequest] = useState({
    purpose: "",
    collaboration: "",
    timeline: "",
    compensation: "",
    message: "",
  })
  const [receiverAddress, setReceiverAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const { connected, sendConnectionRequest, generateRequestId } = useSolanaProgram()

  const handleSendRequest = async () => {
    console.log("🚀 handleSendRequest called with:", {
      connected,
      receiverAddress,
      selectedUser: selectedUser?.name,
      connectionRequest,
      isLoading
    })

    if (!connected) {
      console.error("❌ Wallet not connected in handleSendRequest")
      alert("Please connect your wallet first!")
      return
    }

    try {
      setIsLoading(true)
      console.log("⏳ Starting connection request process...")
      
      // Client-side validation
      console.log("🔍 Starting client-side validation...")
      
      if (!receiverAddress.trim()) {
        console.error("❌ Receiver address is empty")
        throw new Error("Please enter the recipient's wallet address")
      }
      console.log("✅ Receiver address provided:", receiverAddress)

      if (!connectionRequest.message.trim()) {
        console.error("❌ Connection request message is empty")
        throw new Error("Please enter a message")
      }
      console.log("✅ Connection request message provided")

      // Validate wallet address format
      console.log("🔍 Validating wallet address format...")
      try {
        const receiverPubKey = new PublicKey(receiverAddress)
        console.log("✅ Wallet address format validated:", receiverPubKey.toBase58())
      } catch (addressError) {
        console.error("❌ Invalid wallet address format:", addressError)
        throw new Error("Invalid wallet address format. Please check the address and try again.")
      }

      console.log("✅ All client-side validation passed")

      // Create IPFS CID for the request data using real Pinata IPFS
      console.log("📄 Creating IPFS CID for request data...")
      const requestData = {
        purpose: connectionRequest.purpose,
        collaboration: connectionRequest.collaboration,
        timeline: connectionRequest.timeline,
        compensation: connectionRequest.compensation,
      }
      console.log("📄 Request data to upload to IPFS:", requestData)
      
      const ipfsCid = await getCid(requestData)
      console.log("✅ IPFS CID created successfully:", ipfsCid)

      console.log("🎲 Generating unique request ID...")

      const requestId = generateRequestId()
      console.log("✅ Generated request ID:", {
        requestId: requestId.toString(),
        requestIdType: typeof requestId,
        timestamp: new Date().toISOString()
      })

      console.log("📤 Calling sendConnectionRequest with parameters:", {
        receiverAddress,
        ipfsCid,
        requestId: requestId.toString(),
        message: connectionRequest.message,
        messageLength: connectionRequest.message.length
      })

      const signature = await sendConnectionRequest(receiverAddress, ipfsCid, requestId, connectionRequest.message)
      
      console.log("✅ Connection request sent successfully:", {
        signature,
        transactionTime: new Date().toISOString()
      })

      alert(`Connection request sent successfully! Transaction: ${signature}`)
      
      // Reset form and close dialog
      console.log("🧹 Resetting form and closing dialog...")
      setConnectionRequest({
        purpose: "",
        collaboration: "",
        timeline: "",
        compensation: "",
        message: "",
      })
      setReceiverAddress("")
      setSelectedUser(null)
      console.log("✅ Form reset and dialog closed successfully")
      
    } catch (error) {
      console.error("❌ Error in handleSendRequest:", error)
      console.error("❌ Error type:", typeof error)
      console.error("❌ Error name:", error instanceof Error ? error.name : 'Unknown')
      console.error("❌ Error message:", error instanceof Error ? error.message : String(error))
      console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace')
      console.error("❌ Error cause:", error instanceof Error ? error.cause : undefined)
      
      // Display user-friendly error messages
      let errorMessage = "Unknown error occurred"
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Log specific error types
        if (error.name === 'WalletSendTransactionError') {
          console.error("❌ Wallet transaction error detected in connect page:", error.message)
        }
        if (error.message.includes('User rejected')) {
          console.error("❌ User rejected transaction in connect page")
        }
        if (error.message.includes('insufficient funds')) {
          console.error("❌ Insufficient funds in connect page")
        }
        if (error.message.includes('already exists')) {
          console.error("❌ Request already exists error in connect page")
        }
      }
      
      console.error("❌ Final error message shown to user:", errorMessage)
      alert(`Failed to send connection request: ${errorMessage}`)
    } finally {
      setIsLoading(false)
      console.log("🏁 handleSendRequest process completed")
    }
  }

  return (
    <div className="bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Connect with Web3 Professionals</h1>
            <p className="text-gray-600 mt-2">Discover and connect with talented individuals in the Web3 ecosystem</p>
          </div>
          <Link href="/check-requests">
            <Button variant="outline" size="lg">
              <MessageCircle className="w-5 h-5 mr-2" />
              Check Requests
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <Card
              key={user.id}
              className="hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-purple-200 shadow-xl"
            >
              <CardHeader className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-4">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl">{user.name}</CardTitle>
                <CardDescription className="text-sm">
                  {user.title} at {user.company}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {user.location}
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1 text-yellow-500" />
                    {user.rating}
                  </div>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-1" />
                  {user.connections} connections
                </div>

                <div className="flex flex-wrap gap-1">
                  {user.skills.slice(0, 3).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {user.skills.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{user.skills.length - 3} more
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-gray-600 line-clamp-2">{user.bio}</p>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full" onClick={() => setSelectedUser(user)}>
                      View Profile & Connect
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-2xl font-bold">{user.name}</h2>
                          <p className="text-gray-600">
                            {user.title} at {user.company}
                          </p>
                        </div>
                      </DialogTitle>
                    </DialogHeader>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-semibold mb-2">About</h3>
                          <p className="text-gray-600">{user.bio}</p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Experience</h3>
                          <p className="text-gray-600">{user.experience}</p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Skills</h3>
                          <div className="flex flex-wrap gap-2">
                            {user.skills.map((skill) => (
                              <Badge key={skill} variant="secondary">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Recent Projects</h3>
                          <ul className="space-y-1">
                            {user.projects.map((project, index) => (
                              <li key={index} className="text-gray-600">
                                • {project}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Send Connection Request</h3>

                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="receiverAddress">Recipient Wallet Address</Label>
                            <Input
                              placeholder="Enter the recipient's Solana wallet address..."
                              value={receiverAddress}
                              onChange={(e) => setReceiverAddress(e.target.value)}
                            />
                          </div>

                          <div>
                            <Label htmlFor="purpose">Purpose of Connection</Label>
                            <Select
                              onValueChange={(value) => setConnectionRequest({ ...connectionRequest, purpose: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select purpose" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="collaboration">Project Collaboration</SelectItem>
                                <SelectItem value="consultation">Technical Consultation</SelectItem>
                                <SelectItem value="partnership">Business Partnership</SelectItem>
                                <SelectItem value="mentorship">Mentorship</SelectItem>
                                <SelectItem value="networking">Professional Networking</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="collaboration">Type of Collaboration</Label>
                            <Input
                              placeholder="e.g., Smart contract development, Product strategy..."
                              value={connectionRequest.collaboration}
                              onChange={(e) =>
                                setConnectionRequest({ ...connectionRequest, collaboration: e.target.value })
                              }
                            />
                          </div>

                          <div>
                            <Label htmlFor="timeline">Expected Timeline</Label>
                            <Select
                              onValueChange={(value) => setConnectionRequest({ ...connectionRequest, timeline: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select timeline" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="immediate">Immediate (1-2 weeks)</SelectItem>
                                <SelectItem value="short">Short-term (1-3 months)</SelectItem>
                                <SelectItem value="medium">Medium-term (3-6 months)</SelectItem>
                                <SelectItem value="long">Long-term (6+ months)</SelectItem>
                                <SelectItem value="ongoing">Ongoing relationship</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="compensation">Compensation/Exchange</Label>
                            <Input
                              placeholder="e.g., $5000, Equity share, Token allocation, Skill exchange..."
                              value={connectionRequest.compensation}
                              onChange={(e) =>
                                setConnectionRequest({ ...connectionRequest, compensation: e.target.value })
                              }
                            />
                          </div>

                          <div>
                            <Label htmlFor="message">Detailed Message</Label>
                            <Textarea
                              placeholder="Explain your project, why you want to connect, what you can offer, and any other relevant details..."
                              rows={4}
                              value={connectionRequest.message}
                              onChange={(e) => setConnectionRequest({ ...connectionRequest, message: e.target.value })}
                            />
                          </div>

                          <Button 
                            onClick={handleSendRequest} 
                            className="w-full" 
                            disabled={!connected || isLoading}
                          >
                            <Send className="w-5 h-5 mr-2" />
                            {isLoading ? "Sending..." : connected ? "Send Connection Request" : "Connect Wallet First"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
