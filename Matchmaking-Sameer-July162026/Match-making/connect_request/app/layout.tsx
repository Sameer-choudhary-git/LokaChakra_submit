import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Link from "next/link"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { WalletContextProvider } from "@/components/wallet-provider"
import { WalletButton } from "@/components/wallet-button"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Web3 Connect - Professional Networking Platform",
  description: "Connect, collaborate, and build the decentralized future together",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <WalletContextProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <nav className="border-b bg-white">
              <div className="container mx-auto px-4 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-8">
                    <Link href="/" className="text-2xl font-bold text-purple-600 tracking-tight">
                      Web3 Connect
                    </Link>
                    <div className="hidden md:flex space-x-8">
                      <Link
                        href="/connect"
                        className="text-gray-600 hover:text-gray-900 text-lg transition-colors duration-200"
                      >
                        Connect
                      </Link>
                      <Link
                        href="/check-requests"
                        className="text-gray-600 hover:text-gray-900 text-lg transition-colors duration-200"
                      >
                        Requests
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <WalletButton />
                  </div>
                </div>
              </div>
            </nav>
            {children}
          </ThemeProvider>
        </WalletContextProvider>
      </body>
    </html>
  )
}
