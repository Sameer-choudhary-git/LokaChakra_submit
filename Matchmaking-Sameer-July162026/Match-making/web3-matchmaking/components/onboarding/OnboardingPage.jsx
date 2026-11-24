"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@solana/wallet-adapter-react"
import { uploadDataToBlockchain } from "@/lib/blockchain"
import { useToast } from "@/hooks/use-toast"
import RoleSelection from "./RoleSelection"
import FormWrapper from "./FormWrapper"

const OnboardingPage = () => {
  const [step, setStep] = useState(1)
  const [selectedRole, setSelectedRole] = useState("")
  const [formData, setFormData] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const wallet = useWallet()
  const { toast } = useToast()

  const roleSchemas = {
    founder: {
      required: ["name", "role", "startupName", "stage", "domain", "biggestChallenge", "collaboratorsNeeded", "seeking", "growthGoals12m", "preferredModel", "techStack", "hiringNeeds", "fundingNeededUSD", "location", "productType", "fundraisingStage", "tractionSummary"],
      optional: ["interestedInAccel", "previousSupportUsed", "coFounderNeed"]
    },
    investor: {
      required: ["name", "organization", "investorType", "ticketSizeUSD", "stageFocus", "sectorFocus", "geography", "openToCoInvestment", "involvementLevel", "evaluationCriteria", "dealDiscovery", "dealFrequency", "mentoringInterest", "advisoryInterest", "metricsTracked", "investmentPhilosophy"],
      optional: ["coInvestmentType", "toolsUsed", "legalPartnerModel", "portfolio", "impactAlignment"]
    },
    accelerator: {
      required: ["name", "startupTypes", "servicesOffered", "intakeSize", "batchFrequency", "programDuration", "stageFocus", "selectionCriteria", "primaryFocus", "deliveryMode"],
      optional: ["equityTaken", "rejectCriteria", "affiliations", "crossBorderOps", "onboardingHelp"]
    },
    executive: {
      required: ["name", "role", "orgType", "keyKPIs", "exploring", "techInterests", "seeking", "investMentorInterest", "firmPref", "delegateAreas", "budgetMandate"],
      optional: ["partnerFindingApproach", "challenges"]
    },
    government: {
      required: ["role", "department", "domain", "orgType", "position", "yearsActive", "focus"],
      optional: ["challenges", "collabOrgs", "dashboardsUsed", "policyResearchInterest", "collabStyle", "timeline", "impactEvaluation", "constraints"]
    },
    legal: {
      required: ["name", "role", "specialization", "engagementMode"],
      optional: ["toolsUsed", "offerings", "startupExperience", "industries", "mentorshipAvailable", "clientTypes", "challenges", "updateChannels", "privacyConcerns"]
    },
    cybersecurity: {
      required: ["role", "name", "specializationAreas", "domain", "gigPref", "objectives", "toolsFrameworks", "updateMethod", "certifications", "teamPref", "partnershipType"],
      optional: ["logAccessNeed", "mentorshipInterest", "biggestChallenge"]
    },
    freelancer: {
      required: ["role", "name", "expertiseArea", "preferredClients", "workMode", "experienceLevel", "projectTimeline", "findingPlatforms", "teamWork"],
      optional: ["commStyle", "cryptoGigs", "verificationPref"]
    },
    mentor_research: {
      required: ["name", "role", "field", "mentorshipOpenTo", "mentoringStyle", "availability", "compensation"],
      optional: ["researchOutputs", "impact", "collabWanted", "projectInterest", "toolsDatasets", "commStyle", "growthTracking", "challenges"]
    },
    exit_planner: {
      required: ["role", "name", "focus", "dealSizeUSD", "teamStructure", "supportNeeded", "transactionType", "sectors", "dealDiscovery", "tools"],
      optional: ["redFlags", "readinessValidation", "partnershipWork", "dealFrequency", "platformSupport"]
    }
  }

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId)
    setStep(2)
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const normalizeProfileData = (role, formData) => {
    const schema = roleSchemas[role]
    if (!schema) {
      throw new Error(`Unknown role: ${role}`)
    }

    if (!wallet.publicKey) {
      throw new Error('WALLET_NOT_CONNECTED')
    }

    const normalizedData = {
      role: role,
      wallet: wallet.publicKey.toString(),
    }

    schema.required.forEach(field => {
      normalizedData[field] = formData[field] || null
    })

    schema.optional.forEach(field => {
      normalizedData[field] = formData[field] !== undefined ? formData[field] : null
    })

    return normalizedData
  }

  // Calls the server-side API route instead of importing lib/pinata directly
  const getHash = async (profileData) => {
    const res = await fetch('/api/upload-to-ipfs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: profileData }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'IPFS_UPLOAD_FAILED')
    }

    const data = await res.json()
    return data.ipfsHash
  }

  const handleSubmit = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const profileData = normalizeProfileData(selectedRole, formData)

      const userHash = await getHash(profileData)
      const result = await uploadDataToBlockchain(userHash, wallet, selectedRole)

      console.log("Profile created successfully:", profileData)
      console.log("Blockchain result:", result)

      toast({
        title: "Profile Created Successfully! 🎉",
        description: "Your profile has been created and stored on the blockchain.",
        variant: "default",
      })

      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)

    } catch (error) {
      console.error("Error submitting profile:", error)
      if (error.message === 'PROFILE_ALREADY_EXISTS') {
        toast({
          title: "Profile Already Exists! 👤",
          description: "You already have a profile created. Redirecting to your dashboard...",
          variant: "default",
        })

        setTimeout(() => {
          router.push("/dashboard")
        }, 3000)

      } else if (error.message === 'TRANSACTION_REJECTED') {
        toast({
          title: "Transaction Cancelled ❌",
          description: "You cancelled the transaction. Please try again to create your profile.",
          variant: "destructive",
        })

      } else if (error.message === 'INSUFFICIENT_FUNDS') {
        toast({
          title: "Insufficient SOL Balance 💰",
          description: "You need some SOL in your wallet to pay for transaction fees. Please add funds and try again.",
          variant: "destructive",
        })

      } else if (error.message === 'WALLET_NOT_CONNECTED') {
        toast({
          title: "Wallet Not Connected 🔗",
          description: "Please connect your wallet to create a profile.",
          variant: "destructive",
        })

      } else {
        toast({
          title: "Profile Creation Failed ⚠️",
          description: "An unexpected error occurred. Please try again or contact support if the issue persists.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setStep(1)
    setSelectedRole("")
  }

  if (step === 1) {
    return <RoleSelection onRoleSelect={handleRoleSelect} />
  }

  return (
    <FormWrapper
      selectedRole={selectedRole}
      formData={formData}
      onInputChange={handleInputChange}
      onSubmit={handleSubmit}
      onBack={handleBack}
      isLoading={isLoading}
    />
  )
}

export default OnboardingPage