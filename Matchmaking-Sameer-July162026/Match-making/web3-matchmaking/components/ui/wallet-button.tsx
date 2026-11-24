"use client"

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useState, useEffect } from "react"

export function WalletButton({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return a placeholder button that matches the expected structure
    return (
      <button
        className={`wallet-adapter-button wallet-adapter-button-trigger ${className}`}
        disabled
      >
        <span>Loading...</span>
      </button>
    )
  }

  return <WalletMultiButton className={className} />
}
