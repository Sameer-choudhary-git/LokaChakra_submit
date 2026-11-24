"use client"

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useEffect, useState } from "react"

export function WalletButton() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="bg-purple-600 hover:bg-purple-700 rounded-lg h-10 px-4 text-sm font-medium text-white flex items-center justify-center min-w-[140px]">
        Select Wallet
      </div>
    )
  }

  return (
    <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !h-10 !px-4 !text-sm !font-medium" />
  )
}
