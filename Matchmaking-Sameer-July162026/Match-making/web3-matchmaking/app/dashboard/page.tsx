"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Bell, Users, MessageSquare, Settings, LogOut, Menu, Search } from "lucide-react"
import Link from "next/link"
import { WalletButton } from "@/components/ui/wallet-button"
import { useRouter } from "next/navigation"
import { getSuperAgent, generateSuperAgentParam } from "@/lib/superAgent"
import { getUserDataFromBlockchain } from "@/lib/blockchain"
import { createSearchPayload } from "@/lib/searchDataStructure"
import EnhancedSearchForm from "@/components/dashboard/EnhancedSearchForm"

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchFilters, setSearchFilters] = useState({
    role: "",
    searchQuery: "",
    purpose: "",
    experience: "",
    location: "",
    workType: "",
    skills: "",
    availability: "",
  })
  const router = useRouter();

  const stats = [
    { title: "Total Users", value: "50K+", change: "+12%" },
    { title: "Active Matches", value: "2.3K", change: "+8%" },
    { title: "Successful Connections", value: "890", change: "+15%" },
    { title: "New This Week", value: "156", change: "+23%" },
  ]

  const sidebarItems = [
    { name: "Dashboard", href: "/dashboard", icon: Users, active: true },
    { name: "Match Making", href: "/matches", icon: MessageSquare },
    { name: "Support Ticket", href: "/support", icon: Settings, badge: "20" },
  ]

  const handleEnhancedSearch = async (searchFilters: any) => {
    try {
      setIsSearching(true);
      const { publicKey } = window.solana;
      let searcherProfile = {};
      try {
        searcherProfile = await getUserDataFromBlockchain(publicKey.toString());
      } catch (error) {
        console.error("Could not fetch searcher profile:", error);
        searcherProfile = {
          role: "founder", // Default role, should be updated based on user
          name: "Current User",
          location: "Unknown"
        };
      }
      
      const searchPayload = createSearchPayload(
        searcherProfile, 
        searchFilters, 
        publicKey.toString()
      );
      
      alert("Enhanced Search Payload for ML Model: " + JSON.stringify(searchPayload, null, 2));
      
      console.log("Enhanced Search Payload for ML Model:", searchPayload);
      const searchResults = await getSuperAgent(searchPayload);
      console.log("Search Results from Super Agent:", searchResults);
      
      sessionStorage.setItem('searchResults', JSON.stringify(searchResults));
      sessionStorage.setItem('searchFilters', JSON.stringify(searchFilters));
      sessionStorage.setItem('mlSearchPayload', JSON.stringify(searchPayload));
      
      router.push('/matches');
    } catch (error) {
      console.error("Enhanced search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`bg-white w-64 min-h-screen shadow-lg ${sidebarOpen ? "block" : "hidden"} lg:block`}>
        <div className="p-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="text-xl font-bold text-gray-800">Lokachakra</span>
          </div>
        </div>

        <nav className="mt-6">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 ${
                  item.active ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600" : ""
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                <span>{item.name}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-6 left-6">
          <Button variant="ghost" className="flex items-center text-gray-700 hover:text-red-600">
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" className="lg:hidden mr-2" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>ADMIN@LOKACHAKRA.IN</span>
              </div>
              <WalletButton className="!bg-purple-600 hover:!bg-purple-700 !text-sm" />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className={index === 0 ? "border-blue-200 bg-blue-50" : ""}>
                <CardHeader className="pb-2">
                  <div className="text-sm text-gray-600">NUMBER OF USERS</div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Enhanced Search Section */}
          <EnhancedSearchForm 
            onSearch={handleEnhancedSearch}
            isSearching={isSearching}
          />
        </main>
      </div>
    </div>
  )
}
