// lib/searchDataStructure.js

import { allowedNodeEnvironmentFlags } from "process"

/**
 * Creates the complete data structure for ML model input
 * @param {Object} searcherProfile - The profile of the user performing the search
 * @param {Object} searchFilters - The search filters from the form
 * @param {string} searcherId - The ID of the user performing the search
 * @returns {Object} Complete ML model input structure
 */
export function createMLModelInput(searcherProfile, searchFilters, searcherId) {
  return {
    // 1. Who is searching
    searcher: {
      userId: searcherId,
      role: searcherProfile.role,
      profile: searcherProfile,
      searchHistory: [], // This would come from database
      timestamp: new Date().toISOString()
    },

    // 2. What they're looking for
    searchCriteria: {
      filters: searchFilters,
      searchType: "smart_match", // or "exact_match", "similar", "broad"
      priorityWeights: calculatePriorityWeights(searchFilters),
      matchingAlgorithm: "semantic_similarity"
    },

    // 3. Context & Preferences
    context: {
      timestamp: new Date().toISOString(),
      searchId: generateSearchId(),
      maxResults: 50,
      userPreferences: extractUserPreferences(searchFilters)
    },

    // 4. Business Logic Parameters
    matchingRules: {
      roleCompatibility: getRoleCompatibilityRules(),
      scoreWeights: getScoreWeights(),
      mustHaveFilters: getMustHaveFilters(searchFilters),
      niceToHaveFilters: getNiceToHaveFilters(searchFilters),
      excludeRules: getExcludeRules()
    }
  }
}

/**
 * Calculate priority weights based on filled filters
 */
function calculatePriorityWeights(searchFilters) {
  const weights = {
    location: 0.2,
    experience: 0.3,
    skills: 0.4,
    role: 1.0,
    purpose: 0.5
  }

  // Increase weights for filled filters
  if (searchFilters.location) weights.location = 0.4
  if (searchFilters.experience) weights.experience = 0.5
  if (searchFilters.skills) weights.skills = 0.6
  if (searchFilters.purpose) weights.purpose = 0.7

  // Role-specific weight adjustments
  if (searchFilters.targetRole === "investor") {
    weights.funding = 0.8
    weights.stage = 0.7
  }

  return weights
}

/**
 * Extract user preferences from search filters
 */
function extractUserPreferences(searchFilters) {
  return {
    communicationStyle: searchFilters.communicationStyle || "professional",
    remotePreference: searchFilters.remotePreference || "flexible",
    timeZone: searchFilters.timeZone || "flexible",
    urgency: searchFilters.urgency || "medium",
    collaborationType: searchFilters.collaborationType || "flexible"
  }
}

/**
 * Define role compatibility rules
 */
function getRoleCompatibilityRules() {
  return {
    founder: ["investor", "accelerator", "executive", "legal", "mentor_research", "cybersecurity", "freelancer"],
    investor: ["founder", "accelerator", "exit_planner", "legal"],
    accelerator: ["founder", "investor", "mentor_research"],
    executive: ["founder", "investor", "accelerator", "freelancer"],
    legal: ["founder", "investor", "accelerator", "executive", "government"],
    government: ["founder", "legal", "accelerator", "cybersecurity"],
    cybersecurity: ["founder", "executive", "government", "freelancer"],
    freelancer: ["founder", "executive", "cybersecurity"],
    mentor_research: ["founder", "accelerator", "executive"],
    exit_planner: ["founder", "investor", "executive"]
  }
}

/**
 * Define scoring weights for matching algorithm
 */
function getScoreWeights() {
  return {
    profileSimilarity: 0.3,
    geographicMatch: 0.2,
    experienceMatch: 0.2,
    skillsMatch: 0.15,
    availabilityMatch: 0.1,
    purposeAlignment: 0.05
  }
}

/**
 * Get must-have filters based on search criteria
 */
function getMustHaveFilters(searchFilters) {
  const mustHave = ["targetRole"]
  
  if (searchFilters.urgency === "high") {
    mustHave.push("availability")
  }
  
  if (searchFilters.remotePreference === "onsite") {
    mustHave.push("location")
  }

  return mustHave
}

/**
 * Get nice-to-have filters
 */
function getNiceToHaveFilters(searchFilters) {
  return ["experience", "skills", "purpose", "workType"]
}

/**
 * Define exclude rules
 */
function getExcludeRules() {
  return [
    "same_company",
    "previous_connection",
    "blocked_users",
    "incompatible_timezone" // if urgency is high
  ]
}

/**
 * Generate unique search ID
 */
function generateSearchId() {
  return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Extract role-specific search criteria
 */
export function extractRoleSpecificCriteria(searchFilters) {
  const role = searchFilters.targetRole
  console.log("Extracting role-specific criteria for:", role)
  const roleSpecific = {}

  switch (role) {
    case "investor":
      return {
        investorType: searchFilters.investorType || null,
        ticketSizeRange: {
          min: searchFilters.ticketSizeMin ? parseInt(searchFilters.ticketSizeMin) : null,
          max: searchFilters.ticketSizeMax ? parseInt(searchFilters.ticketSizeMax) : null
        },
        stageFocus: searchFilters.stageFocus || null,
        sectorFocus: searchFilters.sectorFocus || null,
        dealFrequency: searchFilters.dealFrequency || null,
        involvementLevel: searchFilters.involvementLevel || null,
        mentoringInterest: searchFilters.mentoringInterest || null
      }

    case "founder":
      return {
        startupStage: searchFilters.startupStage || null,
        fundraisingStage: searchFilters.fundraisingStage || null,
        industry: searchFilters.industry || null,
        fundingNeeded: searchFilters.fundingNeeded ? parseInt(searchFilters.fundingNeeded) : null,
        productType: searchFilters.productType || null
      }

    case "accelerator":
      return {
        programType: searchFilters.programType || null,
        focusAreas: searchFilters.focusAreas || null,
        programDuration: searchFilters.programDuration || null
      }

    case "legal":
      return {
        specialization: searchFilters.legalSpecialization || null,
        clientTypes: searchFilters.clientTypes || null
      }

    case "cybersecurity":
      return {
        specialization: searchFilters.cybersecuritySpecialization || null,
        certifications: searchFilters.certifications || null,
        industries: searchFilters.securityIndustries || null
      }

    case "freelancer":
      return {
        profession: searchFilters.profession || null,
        rateRange: searchFilters.rateRange || null,
      }

    case "mentor_research":
      return {
        researchAreas: searchFilters.researchAreas || null,
        mentoringExperience: searchFilters.mentoringExperience || null
      }

    case "exit_planner":
      return {
        specialization: searchFilters.exitSpecialization || null,
        dealSize: searchFilters.dealSize || null,
        services: searchFilters.exitServices || null
      }

    default:
      return {}
  }
}

/**
 * Structure the complete search payload for API
 */
export function createSearchPayload(searcherProfile, searchFilters, searcherId) {
    const obj = {...searcherProfile}  ;
    const returnObject = obj.user;
    returnObject.prompt = searchFilters;
    const finalObject = {
      user: { ...returnObject }
    }


    console.log("Search Payload for ML Model: createSearchPayload", finalObject); 
    return finalObject;
  return {
    ...baseStructure,
    searchCriteria: {
      ...baseStructure.searchCriteria,
      roleSpecific: roleSpecificCriteria
    }
  }
}

/**
 * Validate search payload before sending to ML model
 */
export function validateSearchPayload(payload) {
  const errors = []

  // Required fields validation
  if (!payload.searcher?.userId) {
    errors.push("Searcher user ID is required")
  }

  if (!payload.searcher?.role) {
    errors.push("Searcher role is required")
  }

  if (!payload.searchCriteria?.filters?.targetRole) {
    errors.push("Target role is required")
  }

  // Business logic validation
  const compatibility = getRoleCompatibilityRules()
  const searcherRole = payload.searcher.role
  const targetRole = payload.searchCriteria.filters.targetRole

  if (!compatibility[searcherRole]?.includes(targetRole)) {
    errors.push(`${searcherRole} cannot search for ${targetRole} - incompatible roles`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Example usage function
 */
export function createExamplePayload() {
  const exampleSearcherProfile = {
    role: "founder",
    name: "John Doe",
    startupName: "TechCorp",
    startupStage: "mvp",
    domains: "FinTech, Blockchain",
    location: "San Francisco, CA",
    fundingNeeded: "500000",
    fundraisingStage: "seed"
  }

  const exampleSearchFilters = {
    targetRole: "investor",
    searchQuery: "seed funding fintech",
    purpose: "funding",
    location: "USA",
    experience: "5-10",
    investorType: "vc",
    ticketSizeMin: "100000",
    ticketSizeMax: "500000",
    stageFocus: "seed",
    sectorFocus: "fintech"
  }

  return createSearchPayload(exampleSearcherProfile, exampleSearchFilters, "user123")
}


