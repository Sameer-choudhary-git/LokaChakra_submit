"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { WalletButton } from "@/components/ui/wallet-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Shield } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const { connected } = useWallet()

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Web3 MatchMaking</CardTitle>
            <CardDescription>Connect your Solana wallet to access the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <WalletButton className="!bg-purple-600 hover:!bg-purple-700" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-center text-sm text-muted-foreground">
              <div className="flex flex-col items-center space-y-2">
                <Users className="h-8 w-8 text-purple-400" />
                <span>50K+ Users</span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Shield className="h-8 w-8 text-purple-400" />
                <span>Secure Web3</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-600">Wallet Connected!</CardTitle>
          <CardDescription>Welcome to Web3 MatchMaking Platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Link href="/onboarding">
              <Button className="w-full bg-purple-600 hover:bg-purple-700">Complete Profile Setup</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full bg-transparent">
                Go to Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex justify-center">
            <WalletButton className="!bg-gray-600 hover:!bg-gray-700" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
