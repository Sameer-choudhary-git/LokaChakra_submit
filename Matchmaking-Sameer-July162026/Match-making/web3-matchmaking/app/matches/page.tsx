"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bell,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  MapPin,
  Briefcase,
  Star,
  Search,
} from "lucide-react";
import Link from "next/link";
import { WalletButton } from "@/components/ui/wallet-button";

const mockMatches = [
  {
    id: 1,
    name: "Sarah Chen",
    role: "Investor",
    company: "Crypto Ventures",
    location: "San Francisco, CA",
    experience: "8 years",
    matchScore: 95,
    bio: "Focused on DeFi and Web3 infrastructure investments. Looking for innovative founders.",
    skills: ["DeFi", "Infrastructure", "Series A"],
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 2,
    name: "Marcus Rodriguez",
    role: "Legal Expert",
    company: "BlockLaw Partners",
    location: "New York, NY",
    experience: "12 years",
    matchScore: 88,
    bio: "Specializing in crypto regulations and smart contract auditing.",
    skills: ["Crypto Law", "Smart Contracts", "Compliance"],
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 3,
    name: "Emily Watson",
    role: "Developer",
    company: "Solana Labs",
    location: "Austin, TX",
    experience: "6 years",
    matchScore: 92,
    bio: "Full-stack developer with expertise in Solana ecosystem and DApp development.",
    skills: ["Solana", "Rust", "React", "Web3.js"],
    avatar: "/placeholder.svg?height=40&width=40",
  },
];

export default function MatchesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  type Match = {
    id: number | string;
    name: string;
    role: string;
    company: string;
    location: string;
    experience: string;
    matchScore: number;
    bio: string;
    skills: string[];
    avatar: string;
    wallet?: string;
    currentRole?: string;
    startupAdvisoryExp?: boolean;
    reasoning?: string;
    commonChallenges?: string;
    specialization?: string[];
  };

  type SearchFilters = {
    profile?: string;
    experience?: string;
    country?: string;
    city?: string;
  };

  const [matches, setMatches] = useState<Match[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  const sidebarItems = [
    { name: "Dashboard", href: "/dashboard", icon: Users },
    {
      name: "Match Making",
      href: "/matches",
      icon: MessageSquare,
      active: true,
    },
    { name: "Support Ticket", href: "/support", icon: Settings, badge: "20" },
  ];

  const loadSearchResults = () => {
    setIsLoading(true);
    try {
      const searchResults = sessionStorage.getItem("searchResults");
      const filters = sessionStorage.getItem("searchFilters");

      if (searchResults) {
        const parsedResults = JSON.parse(searchResults);

        // ✅ Flatten all role-based arrays from recommendations
        const allMatches = Object.values(parsedResults.recommendations || {})
          .filter(Array.isArray)
          .flat()
          .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

        setMatches(allMatches);

        if (filters) {
          setSearchFilters(JSON.parse(filters));
        }
      } else {
        setMatches(mockMatches);
      }
    } catch (error) {
      console.error("Error loading search results:", error);
      setMatches(mockMatches);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSearchResults();
  }, []);

  const clearSearchResults = () => {
    sessionStorage.removeItem("searchResults");
    sessionStorage.removeItem("searchFilters");
    setMatches(mockMatches);
    setSearchFilters(null);
  };

  const formatMatchData = (match: Partial<Match>): Match => {
    return {
      id: match.id || match.wallet || Math.random(),
      name: match.name || "Unknown",
      role: match.role || match.currentRole || "Professional",
      company: match.company || "Independent",
      location: match.location || "Not specified",
      experience:
        match.experience ||
        (match.startupAdvisoryExp ? "Has startup experience" : "N/A"),
      matchScore: match.matchScore || Math.floor(Math.random() * 20) + 80,
      bio:
        match.bio ||
        match.reasoning ||
        match.commonChallenges ||
        "Expert in their domain.",
      skills: match.skills || match.specialization || [],
      avatar: match.avatar || "/placeholder.svg?height=40&width=40",
    };
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div
          className={`bg-white w-64 min-h-screen shadow-lg ${
            sidebarOpen ? "block" : "hidden"
          } lg:block`}
        >
          <div className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <span className="text-xl font-bold text-gray-800">
                Lokachakra
              </span>
            </div>
          </div>
        </div>

        {/* Loader Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white shadow-sm border-b">
            <div className="flex items-center justify-between px-6 py-4">
              <Button
                variant="default"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={loadSearchResults}
              >
                Find Matches
              </Button>
              <h1 className="text-2xl font-semibold text-gray-800">
                Match Making
              </h1>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading matches...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`bg-white w-64 min-h-screen shadow-lg ${
          sidebarOpen ? "block" : "hidden"
        } lg:block`}
      >
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
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 ${
                  item.active
                    ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
                    : ""
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
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-6">
          <Button
            variant="ghost"
            className="flex items-center text-gray-700 hover:text-red-600"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <h1 className="text-2xl font-semibold text-gray-800">
              Match Making
            </h1>
            <div className="flex items-center space-x-4">
              <WalletButton className="!bg-purple-600 hover:!bg-purple-700 !text-sm" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {searchFilters ? "Search Results" : "Your Matches"}
                </h2>
                <p className="text-gray-600">
                  {searchFilters
                    ? `Found ${matches.length} matches for your search criteria`
                    : "Connect with professionals that match your criteria"}
                </p>
              </div>

              {searchFilters && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSearchResults}
                  >
                    Clear Search
                  </Button>
                  <Link href="/dashboard">
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-slate-800 hover:bg-slate-900"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      New Search
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {searchFilters && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  Search Criteria:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {searchFilters?.profile && (
                    <Badge variant="outline" className="bg-white">
                      Profile: {searchFilters.profile}
                    </Badge>
                  )}
                  {searchFilters?.experience && (
                    <Badge variant="outline" className="bg-white">
                      Experience: {searchFilters.experience}
                    </Badge>
                  )}
                  {searchFilters?.country && (
                    <Badge variant="outline" className="bg-white">
                      Country: {searchFilters.country}
                    </Badge>
                  )}
                  {searchFilters?.city && (
                    <Badge variant="outline" className="bg-white">
                      City: {searchFilters.city}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {matches.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No matches found
              </h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search criteria or search for different
                profiles.
              </p>
              <Link href="/dashboard">
                <Button className="bg-slate-800 hover:bg-slate-900">
                  Go Back to Search
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {matches.map((match: Match) => {
                const formattedMatch = formatMatchData(match);
                return (
                  <Card
                    key={formattedMatch.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage
                              src={formattedMatch.avatar}
                              alt={formattedMatch.name}
                            />
                            <AvatarFallback>
                              {formattedMatch.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">
                              {formattedMatch.name}
                            </CardTitle>
                            <CardDescription className="flex items-center">
                              <Briefcase className="h-4 w-4 mr-1" />
                              {formattedMatch.role} at {formattedMatch.company}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium">
                            {formattedMatch.matchScore}%
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-1" />
                          {formattedMatch.location} •{" "}
                          {formattedMatch.experience} experience
                        </div>
                        <p className="text-sm text-gray-700">
                          {formattedMatch.bio}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {formattedMatch.skills.map((skill, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex space-x-2 pt-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                          >
                            Connect
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 bg-transparent"
                          >
                            View Profile
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
