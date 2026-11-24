// components/onboarding/constants/formFields.js

export const founderFields = [
  // Personal Information
  { id: "name", label: "Your Name", required: true, type: "text", placeholder: "Enter your full name" },
  { id: "role", label: "Your Role", required: true, type: "text", placeholder: "e.g. Founder, Co-Founder, CEO" },
  
  // Startup Information
  { id: "startupName", label: "Startup Name", required: true, type: "text", placeholder: "e.g. ChainMed Solutions" },
  { id: "startupStage", label: "Startup Stage", required: true, type: "select", options: [
    { value: "idea", label: "Idea" },
    { value: "mvp", label: "MVP" },
    { value: "early", label: "Early Stage" },
    { value: "growth", label: "Growth Stage" },
    { value: "scale", label: "Scale" }
  ]},
  
  // Business Details
  { id: "domains", label: "Domain(s)", required: true, type: "text", placeholder: "e.g. HealthTech, Blockchain, FinTech" },
  { id: "biggestChallenge", label: "Biggest Challenge", required: true, type: "text", placeholder: "e.g. Market Access, User Acquisition" },
  
  // Team and Collaboration
  { id: "collaboratorsNeeded", label: "Collaborators Needed", required: true, type: "text", placeholder: "e.g. Investors, Technical Experts, Advisors" },
  { id: "currentlySeeking", label: "Currently Seeking", required: true, type: "text", placeholder: "e.g. Seed Investment, Co-founder, Mentorship" },
  
  // Growth Goals
  { id: "growthGoals", label: "12-Month Growth Goals", required: true, type: "textarea", placeholder: "e.g. Enter 3 new regional markets, hire 10 team members, achieve $1M ARR", rows: 3 },
  
  // Funding and Business Model
  { id: "interestedInAccelerator", label: "Interested in Accelerator?", required: false, type: "select", options: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "maybe", label: "Maybe" }
  ]},
  { id: "preferredModel", label: "Preferred Business Model", required: true, type: "text", placeholder: "e.g. SaaS, Marketplace, Revenue-share" },
  
  // Technical and Hiring
  { id: "techStack", label: "Tech Stack", required: true, type: "text", placeholder: "e.g. React, Node.js, PostgreSQL, AWS" },
  { id: "hiringNeeds", label: "Hiring Needs", required: true, type: "text", placeholder: "e.g. Frontend Developer, Marketing Lead" },
  
  // Financial Details
  { id: "fundingNeeded", label: "Funding Needed (USD)", required: true, type: "text", placeholder: "e.g. 500000" },
  { id: "location", label: "Location", required: true, type: "text", placeholder: "e.g. San Francisco, CA" },
  
  // Support and Product
  { id: "previousSupport", label: "Previous Support Used", required: false, type: "text", placeholder: "e.g. Y Combinator, Techstars, Bootstrap" },
  { id: "productType", label: "Product Type", required: true, type: "text", placeholder: "e.g. B2B SaaS, Consumer App, Marketplace" },
  
  // Team and Funding Stage
  { id: "coFounderNeeded", label: "Co-Founder Needed?", required: false, type: "select", options: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" }
  ]},
  { id: "fundraisingStage", label: "Fundraising Stage", required: true, type: "select", options: [
    { value: "pre-seed", label: "Pre-seed" },
    { value: "seed", label: "Seed" },
    { value: "series-a", label: "Series A" },
    { value: "series-b", label: "Series B" },
    { value: "later-stage", label: "Later Stage" },
    { value: "not-fundraising", label: "Not Currently Fundraising" }
  ]},
  
  // Traction Summary
  { id: "tractionSummary", label: "Traction Summary", required: true, type: "textarea", placeholder: "e.g. 10,000 active users, $50K MRR, partnerships with 3 enterprises, featured in TechCrunch", rows: 3 }
]

export const investorFields = [
  // Personal Information
  { id: "fullName", label: "Full Name", required: true, type: "text", placeholder: "e.g. Justin Wilson" },
  { id: "organization", label: "Organization", required: true, type: "text", placeholder: "e.g. Robinson, Cooper and Nelson" },
  
  // Investment Profile
  { id: "investorType", label: "Investor Type", required: true, type: "select", options: [
    { value: "vc", label: "VC" },
    { value: "angel", label: "Angel Investor" },
    { value: "pe", label: "Private Equity" },
    { value: "corporate", label: "Corporate VC" },
    { value: "family-office", label: "Family Office" },
    { value: "crowdfunding", label: "Crowdfunding Platform" }
  ]},
  { id: "ticketSize", label: "Typical Ticket Size (USD)", required: true, type: "text", placeholder: "e.g. 50,000 - 100,000" },
  
  // Investment Focus
  { id: "stageFocus", label: "Stage Focus", required: true, type: "text", placeholder: "e.g. Pre-seed, Seed, Series A" },
  { id: "sectorFocus", label: "Sector Focus", required: true, type: "text", placeholder: "e.g. Fintech, AI, Healthcare" },
  
  // Geographic and Co-investment
  { id: "geography", label: "Geographic Focus", required: true, type: "text", placeholder: "e.g. USA, India, Global" },
  { id: "openToCoInvestment", label: "Open to Co-Investment?", required: true, type: "select", options: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "case-by-case", label: "Case by Case" }
  ]},
  
  // Investment Strategy
  { id: "coInvestmentType", label: "Co-Investment Type", required: false, type: "text", placeholder: "e.g. Syndicate, Direct, Both" },
  { id: "involvementLevel", label: "Preferred Involvement Level", required: true, type: "select", options: [
    { value: "board-seat", label: "Board Seat" },
    { value: "observer", label: "Board Observer" },
    { value: "advisor", label: "Advisory Role" },
    { value: "passive", label: "Passive" },
    { value: "hands-on", label: "Hands-on Support" }
  ]},
  
  // Evaluation and Discovery
  { id: "evaluationCriteria", label: "Key Evaluation Criteria", required: true, type: "text", placeholder: "e.g. Team, Market Size, Traction, Technology" },
  { id: "dealDiscovery", label: "Deal Discovery Method", required: true, type: "select", options: [
    { value: "inbound", label: "Inbound Applications" },
    { value: "outbound", label: "Outbound Sourcing" },
    { value: "both", label: "Both" },
    { value: "referrals", label: "Network Referrals" },
    { value: "events", label: "Events & Conferences" }
  ]},
  
  // Tools and Process
  { id: "toolsUsed", label: "Investment Tools Used", required: false, type: "text", placeholder: "e.g. Crunchbase, Pitchbook, Docsend" },
  { id: "legalPartnerModel", label: "Legal Support Model", required: false, type: "select", options: [
    { value: "in-house", label: "In-house Legal Team" },
    { value: "external", label: "External Law Firm" },
    { value: "hybrid", label: "Hybrid Model" },
    { value: "network", label: "Legal Network" }
  ]},
  
  // Deal Frequency and Portfolio
  { id: "dealFrequency", label: "Deal Frequency", required: true, type: "select", options: [
    { value: "1-per-quarter", label: "1 per quarter" },
    { value: "2-4-per-quarter", label: "2-4 per quarter" },
    { value: "5-10-per-quarter", label: "5-10 per quarter" },
    { value: "10+-per-quarter", label: "10+ per quarter" },
    { value: "opportunistic", label: "Opportunistic" }
  ]},
  { id: "portfolio", label: "Notable Portfolio Companies", required: false, type: "text", placeholder: "e.g. Company A, Company B, Company C" },
  
  // Value-Add Services
  { id: "mentoringInterest", label: "Offer Mentoring?", required: true, type: "select", options: [
    { value: "yes", label: "Yes, actively" },
    { value: "selective", label: "Selective cases" },
    { value: "no", label: "No" }
  ]},
  { id: "advisoryInterest", label: "Advisory Interest?", required: true, type: "select", options: [
    { value: "yes", label: "Yes, interested" },
    { value: "selective", label: "Selective opportunities" },
    { value: "no", label: "Investment only" }
  ]},
  
  // Metrics and Impact
  { id: "metricsYouTrack", label: "Key Metrics You Track", required: true, type: "text", placeholder: "e.g. LTV, CAC, ARR, NPS, Burn Rate" },
  { id: "impactAlignment", label: "Impact/ESG Focus?", required: false, type: "select", options: [
    { value: "yes", label: "Yes, primary focus" },
    { value: "secondary", label: "Secondary consideration" },
    { value: "no", label: "Not a focus" }
  ]},
  
  // Investment Philosophy
  { id: "investmentPhilosophy", label: "Investment Philosophy", required: true, type: "textarea", placeholder: "Describe your investment philosophy, what excites you about potential investments, and what value you bring beyond capital...", rows: 4 }
]

export const genericFields = [
  { id: "name", label: "Full Name", required: true, type: "text", placeholder: "Your full name" },
  { id: "email", label: "Email", required: true, type: "email", placeholder: "your@email.com" },
  { id: "experience", label: "Years of Experience", required: false, type: "select", options: [
    { value: "0-1", label: "0-1 years" },
    { value: "2-5", label: "2-5 years" },
    { value: "5-10", label: "5-10 years" },
    { value: "10+", label: "10+ years" }
  ]},
  { id: "skills", label: "Skills/Expertise", required: false, type: "text", placeholder: "Your key skills" },
  { id: "location", label: "Location", required: false, type: "text", placeholder: "City, Country" },
  { id: "bio", label: "Bio", required: false, type: "textarea", placeholder: "Tell us about yourself and what you're looking for...", rows: 4 },
  { id: "portfolioUrl", label: "Portfolio/Website (Optional)", required: false, type: "text", placeholder: "https://your-website.com" }
]

export const acceleratorFields = [
  { id: "name", label: "Organization Name", required: true, type: "text", placeholder: "e.g. TechAccelerator Inc." },
  { id: "founderName", label: "Your Name", required: true, type: "text", placeholder: "Your full name" },
  { id: "position", label: "Your Position", required: true, type: "text", placeholder: "e.g. Managing Partner, Program Director" },
  { id: "programType", label: "Program Type", required: true, type: "select", options: [
    { value: "accelerator", label: "Accelerator" },
    { value: "incubator", label: "Incubator" },
    { value: "both", label: "Both" }
  ]},
  { id: "focusAreas", label: "Focus Areas", required: true, type: "text", placeholder: "e.g. FinTech, HealthTech, AI" },
  { id: "cohortSize", label: "Cohort Size", required: true, type: "text", placeholder: "e.g. 10-15 startups" },
  { id: "programDuration", label: "Program Duration", required: true, type: "text", placeholder: "e.g. 3 months, 6 months" },
  { id: "location", label: "Location", required: true, type: "text", placeholder: "City, Country" },
  { id: "bio", label: "About Your Program", required: true, type: "textarea", placeholder: "Describe your accelerator program, what you offer, and what you're looking for...", rows: 4 }
]

export const executiveFields = [
  { id: "name", label: "Full Name", required: true, type: "text", placeholder: "Your full name" },
  { id: "title", label: "Current Title", required: true, type: "text", placeholder: "e.g. CEO, CTO, VP of Marketing" },
  { id: "company", label: "Company", required: true, type: "text", placeholder: "Current or most recent company" },
  { id: "industry", label: "Industry", required: true, type: "text", placeholder: "e.g. Technology, Healthcare, Finance" },
  { id: "experience", label: "Years of Experience", required: true, type: "select", options: [
    { value: "5-10", label: "5-10 years" },
    { value: "10-15", label: "10-15 years" },
    { value: "15+", label: "15+ years" }
  ]},
  { id: "expertise", label: "Areas of Expertise", required: true, type: "text", placeholder: "e.g. Strategy, Operations, Business Development" },
  { id: "location", label: "Location", required: true, type: "text", placeholder: "City, Country" },
  { id: "bio", label: "Professional Background", required: true, type: "textarea", placeholder: "Tell us about your executive background and what you're looking for...", rows: 4 }
]

export const legalFields = [
  { id: "name", label: "Full Name", required: true, type: "text", placeholder: "Your full name" },
  { id: "firm", label: "Law Firm/Organization", required: true, type: "text", placeholder: "e.g. Smith & Associates" },
  { id: "specialization", label: "Legal Specialization", required: true, type: "text", placeholder: "e.g. Corporate Law, IP, Regulatory" },
  { id: "experience", label: "Years of Experience", required: true, type: "select", options: [
    { value: "2-5", label: "2-5 years" },
    { value: "5-10", label: "5-10 years" },
    { value: "10+", label: "10+ years" }
  ]},
  { id: "clientTypes", label: "Client Types", required: true, type: "text", placeholder: "e.g. Startups, SMEs, Enterprises" },
  { id: "location", label: "Location", required: true, type: "text", placeholder: "City, Country" },
  { id: "bio", label: "Legal Background", required: true, type: "textarea", placeholder: "Describe your legal expertise and how you can help...", rows: 4 }
]

export const governmentFields = [
  { id: "name", label: "Full Name", required: true, type: "text", placeholder: "Your full name" },
  { id: "department", label: "Department/Agency", required: true, type: "text", placeholder: "e.g. Department of Commerce" },
  { id: "position", label: "Position", required: true, type: "text", placeholder: "e.g. Policy Director, Program Manager" },
  { id: "focusAreas", label: "Focus Areas", required: true, type: "text", placeholder: "e.g. Innovation Policy, Economic Development" },
  { id: "experience", label: "Years of Experience", required: true, type: "select", options: [
    { value: "2-5", label: "2-5 years" },
    { value: "5-10", label: "5-10 years" },
    { value: "10+", label: "10+ years" }
  ]},
  { id: "location", label: "Location", required: true, type: "text", placeholder: "City, Country" },
  { id: "bio", label: "Government Background", required: true, type: "textarea", placeholder: "Describe your role and how you can support the ecosystem...", rows: 4 }
]

export const cybersecurityFields = [
  { id: "name", label: "Full Name", required: true, type: "text", placeholder: "Your full name" },
  { id: "company", label: "Company", required: true, type: "text", placeholder: "Current or most recent company" },
  { id: "specialization", label: "Cybersecurity Specialization", required: true, type: "text", placeholder: "e.g. Penetration Testing, Compliance, Risk Assessment" },
  { id: "certifications", label: "Certifications", required: false, type: "text", placeholder: "e.g. CISSP, CEH, CISM" },
  { id: "experience", label: "Years of Experience", required: true, type: "select", options: [
    { value: "2-5", label: "2-5 years" },
    { value: "5-10", label: "5-10 years" },
    { value: "10+", label: "10+ years" }
  ]},
  { id: "industries", label: "Industries Worked In", required: true, type: "text", placeholder: "e.g. Finance, Healthcare, Technology" },
  { id: "location", label: "Location", required: true, type: "text", placeholder: "City, Country" },
  { id: "bio", label: "Cybersecurity Background", required: true, type: "textarea", placeholder: "Describe your cybersecurity expertise and services...", rows: 4 }
]

export const freelancerFields = [
  { id: "name", label: "Full Name", required: true, type: "text", placeholder: "Your full name" },
  { id: "profession", label: "Profession", required: true, type: "text", placeholder: "e.g. Web Developer, Designer, Consultant" },
  { id: "skills", label: "Skills/Expertise", required: true, type: "text", placeholder: "e.g. React, Node.js, UI/UX Design" },
  { id: "experience", label: "Years of Experience", required: true, type: "select", options: [
    { value: "0-2", label: "0-2 years" },
    { value: "2-5", label: "2-5 years" },
    { value: "5-10", label: "5-10 years" },
    { value: "10+", label: "10+ years" }
  ]},
  { id: "availability", label: "Availability", required: true, type: "select", options: [
    { value: "full-time", label: "Full-time" },
    { value: "part-time", label: "Part-time" },
    { value: "project-based", label: "Project-based" }
  ]},
  { id: "rates", label: "Rates", required: false, type: "text", placeholder: "e.g. $50/hour, $5000/project" },
  { id: "location", label: "Location", required: true, type: "text", placeholder: "City, Country" },
  { id: "portfolioUrl", label: "Portfolio URL", required: false, type: "text", placeholder: "https://your-portfolio.com" },
  { id: "bio", label: "Professional Background", required: true, type: "textarea", placeholder: "Describe your freelance services and expertise...", rows: 4 }
]

export const mentorResearchFields = [
  { id: "name", label: "Full Name", required: true, type: "text", placeholder: "Your full name" },
  { id: "title", label: "Current Title", required: true, type: "text", placeholder: "e.g. Senior Researcher, Professor, Mentor" },
  { id: "organization", label: "Organization", required: true, type: "text", placeholder: "e.g. University, Research Institute" },
  { id: "researchAreas", label: "Research Areas", required: true, type: "text", placeholder: "e.g. AI, Blockchain, Biotechnology" },
  { id: "mentoringExperience", label: "Mentoring Experience", required: true, type: "text", placeholder: "e.g. 5+ years mentoring startups" },
  { id: "expertise", label: "Areas of Expertise", required: true, type: "text", placeholder: "e.g. Product Development, Market Research" },
  { id: "publications", label: "Notable Publications", required: false, type: "text", placeholder: "Key research papers or publications" },
  { id: "location", label: "Location", required: true, type: "text", placeholder: "City, Country" },
  { id: "bio", label: "Background", required: true, type: "textarea", placeholder: "Describe your research background and mentoring approach...", rows: 4 }
]

export const exitPlannerFields = [
  { id: "name", label: "Full Name", required: true, type: "text", placeholder: "Your full name" },
  { id: "firm", label: "Firm/Organization", required: true, type: "text", placeholder: "e.g. Exit Planning Associates" },
  { id: "specialization", label: "Exit Planning Specialization", required: true, type: "text", placeholder: "e.g. M&A, IPO, Management Buyout" },
  { id: "experience", label: "Years of Experience", required: true, type: "select", options: [
    { value: "2-5", label: "2-5 years" },
    { value: "5-10", label: "5-10 years" },
    { value: "10+", label: "10+ years" }
  ]},
  { id: "dealSize", label: "Typical Deal Size", required: true, type: "text", placeholder: "e.g. $1M-$10M, $10M-$50M" },
  { id: "industries", label: "Industries", required: true, type: "text", placeholder: "e.g. Technology, Manufacturing, Services" },
  { id: "services", label: "Services Offered", required: true, type: "text", placeholder: "e.g. Valuation, Due Diligence, Strategy" },
  { id: "location", label: "Location", required: true, type: "text", placeholder: "City, Country" },
  { id: "bio", label: "Professional Background", required: true, type: "textarea", placeholder: "Describe your exit planning expertise and approach...", rows: 4 }
]

export const getFieldsByRole = (role) => {
  switch (role) {
    case "founder":
      return founderFields
    case "investor":
      return investorFields
    case "accelerator":
      return acceleratorFields
    case "executive":
      return executiveFields
    case "legal":
      return legalFields
    case "government":
      return governmentFields
    case "cybersecurity":
      return cybersecurityFields
    case "freelancer":
      return freelancerFields
    case "mentor_research":
      return mentorResearchFields
    case "exit_planner":
      return exitPlannerFields
    default:
      return genericFields
  }
}
