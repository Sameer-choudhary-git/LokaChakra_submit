// components/dashboard/EnhancedSearchForm.jsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Search, Filter, X } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { extractRoleSpecificCriteria } from "@/lib/searchDataStructure"

const EnhancedSearchForm = ({ onSearch, isSearching = false }) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [searchFilters, setSearchFilters] = useState({
    // Basic Search
    targetRole: "",
    searchQuery: "",
    location: "",
    purpose: "",
    
    // Experience & Professional
    experience: "",
    workType: "",
    availability: "",
    
    // Skills & Expertise
    skills: "",
    techStack: "",
    
    // Role-Specific Filters (will show based on targetRole)
    // For Investors
    investorType: "",
    ticketSizeMin: "",
    ticketSizeMax: "",
    stageFocus: "",
    sectorFocus: "",
    geographicFocus: "",
    dealFrequency: "",
    involvementLevel: "",
    mentoringInterest: "",
    
    // For Founders
    startupStage: "",
    fundingNeeded: "",
    fundraisingStage: "",
    industry: "",
    productType: "",
    coFounderNeeded: "",
    
    // For Accelerators
    programType: "",
    focusAreas: "",
    cohortSize: "",
    programDuration: "",
    
    // For Executives
    executiveTitle: "",
    executiveIndustry: "",
    executiveExpertise: "",
    
    // For Legal
    legalSpecialization: "",
    clientTypes: "",
    
    // For Government
    department: "",
    policyAreas: "",
    
    // For Cybersecurity
    cybersecuritySpecialization: "",
    certifications: "",
    securityIndustries: "",
    
    // For Freelancers
    profession: "",
    rateRange: "",
    
    // For Mentor/Research
    researchAreas: "",
    mentoringExperience: "",
    
    // For Exit Planners
    exitSpecialization: "",
    dealSize: "",
    exitServices: "",
    
    // Advanced Filters
    urgency: "",
    collaborationType: "",
    remotePreference: "",
    communicationStyle: "",
    timeZone: ""
  })

  const handleFilterChange = (key, value) => {
    console.log(`Filter changed: ${key} = ${value}`)
    setSearchFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setSearchFilters({
      targetRole: "",
      searchQuery: "",
      location: "",
      purpose: "",
      experience: "",
      workType: "",
      availability: "",
      skills: "",
      techStack: "",
      investorType: "",
      ticketSizeMin: "",
      ticketSizeMax: "",
      stageFocus: "",
      sectorFocus: "",
      geographicFocus: "",
      dealFrequency: "",
      involvementLevel: "",
      mentoringInterest: "",
      startupStage: "",
      fundingNeeded: "",
      fundraisingStage: "",
      industry: "",
      productType: "",
      coFounderNeeded: "",
      programType: "",
      focusAreas: "",
      cohortSize: "",
      programDuration: "",
      executiveTitle: "",
      executiveIndustry: "",
      executiveExpertise: "",
      legalSpecialization: "",
      clientTypes: "",
      department: "",
      policyAreas: "",
      cybersecuritySpecialization: "",
      certifications: "",
      securityIndustries: "",
      profession: "",
      rateRange: "",
      researchAreas: "",
      mentoringExperience: "",
      exitSpecialization: "",
      dealSize: "",
      exitServices: "",
      urgency: "",
      collaborationType: "",
      remotePreference: "",
      communicationStyle: "",
      timeZone: ""
    })
  }

  const handleSearch = () => {
    const roleSpecificCriteria = extractRoleSpecificCriteria(searchFilters)
    // also add basic filters
    roleSpecificCriteria.targetRole = searchFilters.targetRole || null
    roleSpecificCriteria.searchQuery = searchFilters.searchQuery || null
    roleSpecificCriteria.location = searchFilters.location || null
    roleSpecificCriteria.purpose = searchFilters.purpose || null
    roleSpecificCriteria.experience = searchFilters.experience || null
    roleSpecificCriteria.skills = searchFilters.skills || null

    // adding advanced filters
    roleSpecificCriteria.workType = searchFilters.workType || null
    roleSpecificCriteria.availability = searchFilters.availability || null
    roleSpecificCriteria.urgency = searchFilters.urgency || null
    roleSpecificCriteria.remotePreference = searchFilters.remotePreference || null
    roleSpecificCriteria.collaborationType = searchFilters.communicationStyle || null
    roleSpecificCriteria.timeZone = searchFilters.timeZone || null

    console.log("Role-Specific Criteria:", roleSpecificCriteria)
    onSearch(roleSpecificCriteria);
  }

  const renderRoleSpecificFilters = () => {
    const role = searchFilters.targetRole
    
    if (!role) return null

    switch (role) {
      case "investor":
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Investor-Specific Filters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="investorType">Investor Type</Label>
                <Select onValueChange={(value) => handleFilterChange("investorType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vc">VC</SelectItem>
                    <SelectItem value="angel">Angel Investor</SelectItem>
                    <SelectItem value="pe">Private Equity</SelectItem>
                    <SelectItem value="corporate">Corporate VC</SelectItem>
                    <SelectItem value="family-office">Family Office</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="ticketSizeMin">Min Ticket Size ($)</Label>
                <Input
                  id="ticketSizeMin"
                  type="number"
                  placeholder="e.g. 50000"
                  value={searchFilters.ticketSizeMin}
                  onChange={(e) => handleFilterChange("ticketSizeMin", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="ticketSizeMax">Max Ticket Size ($)</Label>
                <Input
                  id="ticketSizeMax"
                  type="number"
                  placeholder="e.g. 500000"
                  value={searchFilters.ticketSizeMax}
                  onChange={(e) => handleFilterChange("ticketSizeMax", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="stageFocus">Stage Focus</Label>
                <Input
                  id="stageFocus"
                  placeholder="e.g. Seed, Series A"
                  value={searchFilters.stageFocus}
                  onChange={(e) => handleFilterChange("stageFocus", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="sectorFocus">Sector Focus</Label>
                <Input
                  id="sectorFocus"
                  placeholder="e.g. Fintech, AI, Healthcare"
                  value={searchFilters.sectorFocus}
                  onChange={(e) => handleFilterChange("sectorFocus", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="dealFrequency">Deal Frequency</Label>
                <Select onValueChange={(value) => handleFilterChange("dealFrequency", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-per-quarter">1 per quarter</SelectItem>
                    <SelectItem value="2-4-per-quarter">2-4 per quarter</SelectItem>
                    <SelectItem value="5-10-per-quarter">5-10 per quarter</SelectItem>
                    <SelectItem value="10+-per-quarter">10+ per quarter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case "founder":
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Founder-Specific Filters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startupStage">Startup Stage</Label>
                <Select onValueChange={(value) => handleFilterChange("startupStage", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="mvp">MVP</SelectItem>
                    <SelectItem value="early">Early Stage</SelectItem>
                    <SelectItem value="growth">Growth Stage</SelectItem>
                    <SelectItem value="scale">Scale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="fundraisingStage">Fundraising Stage</Label>
                <Select onValueChange={(value) => handleFilterChange("fundraisingStage", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre-seed">Pre-seed</SelectItem>
                    <SelectItem value="seed">Seed</SelectItem>
                    <SelectItem value="series-a">Series A</SelectItem>
                    <SelectItem value="series-b">Series B</SelectItem>
                    <SelectItem value="later-stage">Later Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  placeholder="e.g. FinTech, HealthTech"
                  value={searchFilters.industry}
                  onChange={(e) => handleFilterChange("industry", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="fundingNeeded">Funding Needed ($)</Label>
                <Input
                  id="fundingNeeded"
                  type="number"
                  placeholder="e.g. 500000"
                  value={searchFilters.fundingNeeded}
                  onChange={(e) => handleFilterChange("fundingNeeded", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="productType">Product Type</Label>
                <Input
                  id="productType"
                  placeholder="e.g. B2B SaaS, Consumer App"
                  value={searchFilters.productType}
                  onChange={(e) => handleFilterChange("productType", e.target.value)}
                />
              </div>
            </div>
          </div>
        )

      case "accelerator":
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Accelerator-Specific Filters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="programType">Program Type</Label>
                <Select onValueChange={(value) => handleFilterChange("programType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accelerator">Accelerator</SelectItem>
                    <SelectItem value="incubator">Incubator</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="focusAreas">Focus Areas</Label>
                <Input
                  id="focusAreas"
                  placeholder="e.g. FinTech, HealthTech, AI"
                  value={searchFilters.focusAreas}
                  onChange={(e) => handleFilterChange("focusAreas", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="programDuration">Program Duration</Label>
                <Input
                  id="programDuration"
                  placeholder="e.g. 3 months, 6 months"
                  value={searchFilters.programDuration}
                  onChange={(e) => handleFilterChange("programDuration", e.target.value)}
                />
              </div>
            </div>
          </div>
        )

      case "legal":
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Legal-Specific Filters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="legalSpecialization">Legal Specialization</Label>
                <Input
                  id="legalSpecialization"
                  placeholder="e.g. Corporate Law, IP, Regulatory"
                  value={searchFilters.legalSpecialization}
                  onChange={(e) => handleFilterChange("legalSpecialization", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="clientTypes">Client Types</Label>
                <Input
                  id="clientTypes"
                  placeholder="e.g. Startups, SMEs, Enterprises"
                  value={searchFilters.clientTypes}
                  onChange={(e) => handleFilterChange("clientTypes", e.target.value)}
                />
              </div>
            </div>
          </div>
        )

      case "cybersecurity":
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Cybersecurity-Specific Filters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cybersecuritySpecialization">Specialization</Label>
                <Input
                  id="cybersecuritySpecialization"
                  placeholder="e.g. Penetration Testing, Compliance"
                  value={searchFilters.cybersecuritySpecialization}
                  onChange={(e) => handleFilterChange("cybersecuritySpecialization", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="certifications">Certifications</Label>
                <Input
                  id="certifications"
                  placeholder="e.g. CISSP, CEH, CISM"
                  value={searchFilters.certifications}
                  onChange={(e) => handleFilterChange("certifications", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="securityIndustries">Industries</Label>
                <Input
                  id="securityIndustries"
                  placeholder="e.g. Finance, Healthcare, Technology"
                  value={searchFilters.securityIndustries}
                  onChange={(e) => handleFilterChange("securityIndustries", e.target.value)}
                />
              </div>
            </div>
          </div>
        )

      case "freelancer":
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Freelancer-Specific Filters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="profession">Profession</Label>
                <Input
                  id="profession"
                  placeholder="e.g. Web Developer, Designer"
                  value={searchFilters.profession}
                  onChange={(e) => handleFilterChange("profession", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="rateRange">Rate Range</Label>
                <Input
                  id="rateRange"
                  placeholder="e.g. $50-100/hour"
                  value={searchFilters.rateRange}
                  onChange={(e) => handleFilterChange("rateRange", e.target.value)}
                />
              </div>
            </div>
          </div>
        )

      case "executive":
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Executive-Specific Filters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="executiveTitle">Executive Title</Label>
                <Select onValueChange={(value) => handleFilterChange("executiveTitle", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select title" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ceo">CEO</SelectItem>
                    <SelectItem value="cto">CTO</SelectItem>
                    <SelectItem value="cfo">CFO</SelectItem>
                    <SelectItem value="cmo">CMO</SelectItem>
                    <SelectItem value="coo">COO</SelectItem>
                    <SelectItem value="vp">VP</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="executiveIndustry">Industry Experience</Label>
                <Input
                  id="executiveIndustry"
                  placeholder="e.g. FinTech, HealthTech, Enterprise SaaS"
                  value={searchFilters.executiveIndustry}
                  onChange={(e) => handleFilterChange("executiveIndustry", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="executiveExpertise">Core Expertise</Label>
                <Input
                  id="executiveExpertise"
                  placeholder="e.g. Product Strategy, Operations, Sales"
                  value={searchFilters.executiveExpertise}
                  onChange={(e) => handleFilterChange("executiveExpertise", e.target.value)}
                />
              </div>
            </div>
          </div>
        )

      case "government":
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Government-Specific Filters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="department">Department/Agency</Label>
                <Input
                  id="department"
                  placeholder="e.g. Commerce, Treasury, Innovation"
                  value={searchFilters.department}
                  onChange={(e) => handleFilterChange("department", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="policyAreas">Policy Areas</Label>
                <Input
                  id="policyAreas"
                  placeholder="e.g. Technology, Finance, Innovation"
                  value={searchFilters.policyAreas}
                  onChange={(e) => handleFilterChange("policyAreas", e.target.value)}
                />
              </div>
            </div>
          </div>
        )

      case "mentor_research":
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Mentor/Research-Specific Filters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="researchAreas">Research Areas</Label>
                <Input
                  id="researchAreas"
                  placeholder="e.g. Blockchain, AI, Fintech, Market Analysis"
                  value={searchFilters.researchAreas}
                  onChange={(e) => handleFilterChange("researchAreas", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="mentoringExperience">Mentoring Experience</Label>
                <Select onValueChange={(value) => handleFilterChange("mentoringExperience", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">New to Mentoring</SelectItem>
                    <SelectItem value="intermediate">Some Experience (1-3 years)</SelectItem>
                    <SelectItem value="experienced">Experienced (3-7 years)</SelectItem>
                    <SelectItem value="expert">Expert Mentor (7+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case "exit_planner":
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Exit Planner-Specific Filters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="exitSpecialization">Exit Specialization</Label>
                <Select onValueChange={(value) => handleFilterChange("exitSpecialization", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ipo">IPO</SelectItem>
                    <SelectItem value="acquisition">Acquisition</SelectItem>
                    <SelectItem value="merger">Merger</SelectItem>
                    <SelectItem value="strategic-sale">Strategic Sale</SelectItem>
                    <SelectItem value="management-buyout">Management Buyout</SelectItem>
                    <SelectItem value="liquidation">Liquidation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="dealSize">Deal Size Range</Label>
                <Select onValueChange={(value) => handleFilterChange("dealSize", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select deal size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-1m">Under $1M</SelectItem>
                    <SelectItem value="1m-10m">$1M - $10M</SelectItem>
                    <SelectItem value="10m-50m">$10M - $50M</SelectItem>
                    <SelectItem value="50m-100m">$50M - $100M</SelectItem>
                    <SelectItem value="over-100m">Over $100M</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="exitServices">Exit Services</Label>
                <Input
                  id="exitServices"
                  placeholder="e.g. Valuation, Due Diligence, Negotiation"
                  value={searchFilters.exitServices}
                  onChange={(e) => handleFilterChange("exitServices", e.target.value)}
                />
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Search className="h-5 w-5" />
          Smart Search & Matching
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Search Fields */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Basic Search</h3>
          
          {/* Row 1: Target Role and Search Query */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="targetRole">Looking For (Role)</Label>
              <Select onValueChange={(value) => handleFilterChange("targetRole", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role you're looking for" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="founder">Founder</SelectItem>
                  <SelectItem value="investor">Investor</SelectItem>
                  <SelectItem value="accelerator">Accelerator</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="cybersecurity">Cybersecurity</SelectItem>
                  <SelectItem value="freelancer">Freelancer</SelectItem>
                  <SelectItem value="mentor_research">Mentor Research</SelectItem>
                  <SelectItem value="exit_planner">Exit Planner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="searchQuery">Search Keywords</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="searchQuery"
                  placeholder="e.g. seed funding fintech, AI startup..."
                  value={searchFilters.searchQuery}
                  onChange={(e) => handleFilterChange("searchQuery", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Purpose and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                placeholder="e.g. funding, partnership, hiring, mentorship"
                value={searchFilters.purpose}
                onChange={(e) => handleFilterChange("purpose", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g. San Francisco, Remote, Global"
                value={searchFilters.location}
                onChange={(e) => handleFilterChange("location", e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Experience and Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="experience">Experience Level</Label>
              <Select onValueChange={(value) => handleFilterChange("experience", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                  <SelectItem value="mid">Mid Level (2-5 years)</SelectItem>
                  <SelectItem value="senior">Senior Level (5-10 years)</SelectItem>
                  <SelectItem value="expert">Expert Level (10+ years)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="skills">Skills/Technologies</Label>
              <Input
                id="skills"
                placeholder="e.g. blockchain, AI, fintech, marketing"
                value={searchFilters.skills}
                onChange={(e) => handleFilterChange("skills", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Role-Specific Filters */}
        {renderRoleSpecificFilters()}

        {/* Advanced Filters */}
        <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Advanced Filters
              </span>
              <span>{showAdvancedFilters ? "−" : "+"}</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="workType">Work Type</Label>
                <Select onValueChange={(value) => handleFilterChange("workType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select work type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full Time</SelectItem>
                    <SelectItem value="part-time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="availability">Availability</Label>
                <Select onValueChange={(value) => handleFilterChange("availability", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Available Immediately</SelectItem>
                    <SelectItem value="2-weeks">Available in 2 weeks</SelectItem>
                    <SelectItem value="1-month">Available in 1 month</SelectItem>
                    <SelectItem value="3-months">Available in 3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="urgency">Search Urgency</Label>
                <Select onValueChange={(value) => handleFilterChange("urgency", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="remotePreference">Remote Preference</Label>
                <Select onValueChange={(value) => handleFilterChange("remotePreference", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote Only</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site Only</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="collaborationType">Collaboration Type</Label>
                <Select onValueChange={(value) => handleFilterChange("collaborationType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equity">Equity Partnership</SelectItem>
                    <SelectItem value="advisory">Advisory Role</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                    <SelectItem value="employment">Employment</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timeZone">Time Zone Preference</Label>
                <Select onValueChange={(value) => handleFilterChange("timeZone", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pst">Pacific (PST)</SelectItem>
                    <SelectItem value="est">Eastern (EST)</SelectItem>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="ist">India (IST)</SelectItem>
                    <SelectItem value="cet">Central Europe (CET)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Clear All Filters
          </Button>

          <Button 
            onClick={handleSearch}
            disabled={isSearching || !searchFilters.targetRole}
            className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-2 disabled:opacity-50"
          >
            {isSearching ? "Searching..." : "Find Matches"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default EnhancedSearchForm
