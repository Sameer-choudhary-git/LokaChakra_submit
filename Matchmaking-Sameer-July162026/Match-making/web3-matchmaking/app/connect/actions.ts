"use server"

import { generateText } from "ai"
import { google } from "@ai-sdk/google"

interface UserProfile {
  id: string
  name: string
  role: string
  skills: string[]
  experience: string
  bio: string
}

interface Requirements {
  title: string
  description: string
  budget: string
  timeline: string
  type: "professional" | "casual"
}

interface Agreement {
  id: string
  title: string
  description: string
  deliverables: string[]
  timeline: string
  compensation: string
  checkpoints: string[]
  type: "professional" | "casual"
  estimatedCost?: string
}

export async function generateAgreements({
  matcherProfile,
  matchedProfile,
  requirements,
}: {
  matcherProfile: UserProfile
  matchedProfile: UserProfile
  requirements: Requirements
}): Promise<Agreement[]> {
  const prompt = `
    Generate 4 different collaboration agreements for a matchmaking platform based on the following information:

    MATCHER PROFILE:
    - Name: ${matcherProfile.name}
    - Role: ${matcherProfile.role}
    - Skills: ${matcherProfile.skills.join(", ")}
    - Experience: ${matcherProfile.experience}
    - Bio: ${matcherProfile.bio}

    MATCHED PROFILE:
    - Name: ${matchedProfile.name}
    - Role: ${matchedProfile.role}
    - Skills: ${matchedProfile.skills.join(", ")}
    - Experience: ${matchedProfile.experience}
    - Bio: ${matchedProfile.bio}

    PROJECT REQUIREMENTS:
    - Title: ${requirements.title}
    - Description: ${requirements.description}
    - Budget: ${requirements.budget}
    - Timeline: ${requirements.timeline}
    - Type: ${requirements.type}

    ${
      requirements.type === "casual"
        ? `Since this is a CASUAL HELP request, generate agreements that:
         - Focus on community building and reputation
         - Only involve blockchain fees (no additional payments)
         - Are more flexible and less formal
         - Emphasize learning and mutual benefit
         - Include estimated blockchain costs ($5-15)`
        : `Since this is a PROFESSIONAL partnership, generate agreements that:
         - Include proper compensation structures
         - Have formal deliverables and timelines
         - Focus on business outcomes
         - Include various payment models (milestone, equity, revenue-sharing, fixed-fee)`
    }

    For each agreement, provide:
    1. A unique title that reflects the collaboration type
    2. A brief description of the partnership approach
    3. 3-4 key deliverables
    4. A realistic timeline
    5. Compensation structure (or "Only blockchain fees" for casual)
    6. 4 specific, actionable checkpoints for progress tracking
    7. Type: "${requirements.type}"
    ${requirements.type === "casual" ? "8. estimatedCost: estimated blockchain fees" : ""}

    Make each agreement distinct in approach.
    
    Return the response as a JSON array with this exact structure:
    [
      {
        "id": "agreement-1",
        "title": "Agreement Title",
        "description": "Brief description of the partnership approach",
        "deliverables": ["Deliverable 1", "Deliverable 2", "Deliverable 3"],
        "timeline": "Timeline description",
        "compensation": "Compensation structure",
        "checkpoints": ["Checkpoint 1", "Checkpoint 2", "Checkpoint 3", "Checkpoint 4"],
        "type": "${requirements.type}"${requirements.type === "casual" ? ',\n        "estimatedCost": "Estimated cost"' : ""}
      }
    ]
  `

  try {
    const { text } = await generateText({
      model: google("gemini-1.5-pro"),
      prompt,
      system:
        "You are an expert in creating professional collaboration agreements. Always respond with valid JSON only, no additional text or formatting. Ensure all agreements are practical and actionable.",
    })
    const agreements = JSON.parse(text.trim())

    if (!Array.isArray(agreements) || agreements.length !== 4) {
      throw new Error("Invalid response format")
    }

    return agreements
  } catch (error) {
    console.error("Error generating agreements:", error)

    // Fallback agreements based on type
    if (requirements.type === "casual") {
      return [
        {
          id: "casual-1",
          title: "Community Learning Exchange",
          description: "A collaborative learning partnership focused on skill sharing and community building.",
          deliverables: [
            "Knowledge sharing sessions",
            "Code review and feedback",
            "Documentation and tutorials",
            "Community contribution",
          ],
          timeline: "2-3 months flexible engagement",
          compensation: "Only blockchain fees",
          checkpoints: [
            "Initial project setup and goal alignment",
            "First knowledge sharing session completed",
            "Mid-project review and feedback exchange",
            "Final deliverables and community contribution",
          ],
          type: "casual" as const,
          estimatedCost: "$8-12 blockchain fees",
        },
        {
          id: "casual-2",
          title: "Open Source Collaboration",
          description: "Contributing to open source projects together for mutual learning and reputation building.",
          deliverables: [
            "Open source contributions",
            "Peer code reviews",
            "Technical documentation",
            "Community engagement",
          ],
          timeline: "Ongoing flexible commitment",
          compensation: "Only blockchain fees",
          checkpoints: [
            "Project selection and contribution plan",
            "First significant contribution made",
            "Peer review process established",
            "Community recognition achieved",
          ],
          type: "casual" as const,
          estimatedCost: "$5-10 blockchain fees",
        },
        {
          id: "casual-3",
          title: "Skill Mentorship Program",
          description: "A mentorship-based collaboration where both parties learn and grow together.",
          deliverables: [
            "Regular mentorship sessions",
            "Skill development milestones",
            "Project portfolio building",
            "Network expansion",
          ],
          timeline: "3-4 months mentorship period",
          compensation: "Only blockchain fees",
          checkpoints: [
            "Mentorship goals and schedule established",
            "First skill milestone achieved",
            "Portfolio project completed",
            "Mentorship program successfully concluded",
          ],
          type: "casual" as const,
          estimatedCost: "$10-15 blockchain fees",
        },
        {
          id: "casual-4",
          title: "Innovation Lab Partnership",
          description: "Experimental collaboration to explore new technologies and build innovative solutions.",
          deliverables: [
            "Technology exploration",
            "Prototype development",
            "Innovation documentation",
            "Knowledge sharing",
          ],
          timeline: "1-2 months exploration phase",
          compensation: "Only blockchain fees",
          checkpoints: [
            "Technology stack and goals defined",
            "Initial prototype developed",
            "Testing and iteration completed",
            "Final innovation showcase",
          ],
          type: "casual" as const,
          estimatedCost: "$7-12 blockchain fees",
        },
      ]
    }
    return [
      {
        id: "agreement-1",
        title: "Milestone-Based Partnership",
        description: "A structured approach with payments tied to specific project milestones and deliverables.",
        deliverables: [
          "Complete project planning and architecture",
          "Develop MVP with core features",
          "Implement user testing and feedback integration",
          "Deploy production-ready application",
        ],
        timeline: "4 months with monthly milestone reviews",
        compensation: "25% upfront, 75% distributed across milestones",
        checkpoints: [
          "Project scope and technical architecture finalized",
          "MVP development completed and tested",
          "User feedback incorporated and features refined",
          "Final deployment and handover completed",
        ],
        type: "professional" as const,
      },
      {
        id: "agreement-2",
        title: "Equity-Based Collaboration",
        description: "A partnership model where both parties share ownership and long-term success of the project.",
        deliverables: [
          "Joint product development and launch",
          "Shared marketing and user acquisition",
          "Ongoing maintenance and feature development",
          "Revenue optimization and scaling",
        ],
        timeline: "6 months initial development, ongoing partnership",
        compensation: "60/40 equity split with shared expenses",
        checkpoints: [
          "Legal partnership agreement and equity structure finalized",
          "Product development phase 1 completed",
          "Market launch and initial user acquisition achieved",
          "Revenue targets met and scaling plan implemented",
        ],
        type: "professional" as const,
      },
      {
        id: "agreement-3",
        title: "Revenue-Sharing Model",
        description:
          "A performance-based partnership where compensation is tied to project success and revenue generation.",
        deliverables: [
          "Market-ready product development",
          "Revenue generation strategy implementation",
          "Customer acquisition and retention systems",
          "Performance analytics and optimization",
        ],
        timeline: "3-5 months development, 12 months revenue sharing",
        compensation: "70/30 revenue split after break-even",
        checkpoints: [
          "Product development and testing completed",
          "Revenue generation systems implemented",
          "First paying customers acquired",
          "Sustainable revenue stream established",
        ],
        type: "professional" as const,
      },
      {
        id: "agreement-4",
        title: "Fixed-Fee Professional Services",
        description: "A traditional service-based agreement with defined scope, timeline, and fixed compensation.",
        deliverables: [
          "Complete technical implementation",
          "Documentation and knowledge transfer",
          "Testing and quality assurance",
          "30-day post-launch support",
        ],
        timeline: "3 months development with weekly check-ins",
        compensation: `${requirements.budget} paid in 3 installments`,
        checkpoints: [
          "Project requirements and specifications approved",
          "Development phase 1 (50%) completed",
          "Testing and refinements completed",
          "Final delivery and support period completed",
        ],
        type: "professional" as const,
      },
    ]
  }
}
