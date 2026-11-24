// components/onboarding/constants/roles.js
import { User, Building, Scale, Briefcase, Shield, Globe, Zap, Users, FileText, UserCheck } from "lucide-react"

export const roles = [
  { 
    id: "founder", 
    label: "Founder", 
    icon: Building, 
    color: "bg-blue-500",
    description: "Building the next big thing"
  },
  { 
    id: "investor", 
    label: "Investor", 
    icon: Briefcase, 
    color: "bg-green-500",
    description: "Funding innovative startups"
  },
  { 
    id: "accelerator", 
    label: "Accelerator", 
    icon: Zap, 
    color: "bg-purple-500",
    description: "Accelerating startup growth"
  },
  { 
    id: "executive", 
    label: "Executive", 
    icon: User, 
    color: "bg-orange-500",
    description: "Leading strategic initiatives"
  },
  { 
    id: "legal", 
    label: "Legal", 
    icon: Scale, 
    color: "bg-indigo-500",
    description: "Navigating regulatory landscapes"
  },
  { 
    id: "government", 
    label: "Government", 
    icon: Globe, 
    color: "bg-red-500",
    description: "Policy and regulation expertise"
  },
  { 
    id: "cybersecurity", 
    label: "Cybersecurity", 
    icon: Shield, 
    color: "bg-gray-500",
    description: "Protecting digital assets"
  },
  { 
    id: "freelancer", 
    label: "Freelancer", 
    icon: Users, 
    color: "bg-yellow-500",
    description: "Independent expertise"
  },
  { 
    id: "mentor_research", 
    label: "Mentor Research", 
    icon: UserCheck, 
    color: "bg-teal-500",
    description: "Mentoring and research guidance"
  },
  { 
    id: "exit_planner", 
    label: "Exit Planner", 
    icon: FileText, 
    color: "bg-cyan-500",
    description: "Strategic exit planning"
  },
]

export const getRoleById = (id) => {
  return roles.find(role => role.id === id)
}

export const getRoleFormComponent = (roleId) => {
  const componentMap = {
    founder: 'FounderForm',
    investor: 'InvestorForm',
    accelerator: 'AcceleratorForm',
    executive: 'ExecutiveForm',
    legal: 'LegalForm',
    government: 'GovernmentForm',
    cybersecurity: 'CybersecurityForm',
    freelancer: 'FreelancerForm',
    mentor_research: 'MentorResearcherForm',
    exit_planner: 'ExitPlannerForm',
  }
  
  return componentMap[roleId] || 'GenericForm'
}
