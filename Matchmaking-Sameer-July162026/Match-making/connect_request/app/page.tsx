import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MessageSquare, Handshake, Zap } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Web3 Connect</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            The premier networking platform for Web3 professionals. Connect, collaborate, and build the decentralized
            future together.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/connect">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                Find Connections
              </Button>
            </Link>
            <Link href="/check-requests">
              <Button size="lg" variant="outline">
                Check Requests
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Users className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Connect</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Find and connect with Web3 professionals, developers, and innovators</CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <MessageSquare className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Communicate</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Chat and collaborate with your connections in real-time</CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Handshake className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Collaborate</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Set terms, negotiate deals, and work together on projects</CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Zap className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <CardTitle>Build</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Create innovative Web3 solutions and shape the future</CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
