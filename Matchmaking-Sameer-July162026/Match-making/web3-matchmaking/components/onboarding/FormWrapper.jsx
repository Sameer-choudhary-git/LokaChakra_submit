// components/onboarding/FormWrapper.jsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import { getRoleById } from "./constants/roles"
import FounderForm from "./forms/FounderForm"
import InvestorForm from "./forms/InvestorForm"
import AcceleratorForm from "./forms/AcceleratorForm"
import ExecutiveForm from "./forms/ExecutiveForm"
import GovernmentForm from "./forms/GovernmentForm"
import MentorResearcherForm from "./forms/MentorResearcherForm"
import LegalForm from "./forms/LegalForm"
import CybersecurityForm from "./forms/CybersecurityForm"
import FreelancerForm from "./forms/FreelancerForm"
import ExitPlannerForm from "./forms/ExitPlannerForm"

const FormWrapper = ({ 
  selectedRole, 
  formData, 
  onInputChange, 
  onSubmit, 
  onBack,
  isLoading = false
}) => {
  const selectedRoleData = getRoleById(selectedRole)

  const renderRoleSpecificForm = () => {
    switch (selectedRole) {
      case "founder":
        return (
          <FounderForm 
            formData={formData}
            onInputChange={onInputChange}
          />
        )
      case "investor":
        return (
          <InvestorForm 
            formData={formData}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
          />
        )
      case "accelerator":
        return (
          <AcceleratorForm 
            formData={formData}
            onInputChange={onInputChange}
          />
        )
      case "executive":
        return (
          <ExecutiveForm 
            formData={formData}
            onInputChange={onInputChange}
          />
        )
      case "government":
        return (
          <GovernmentForm 
            formData={formData}
            onInputChange={onInputChange}
          />
        )
      case "mentor_research":
        return (
          <MentorResearcherForm 
            formData={formData}
            onInputChange={onInputChange}
          />
        )
      case "legal":
        return (
          <LegalForm 
            formData={formData}
            onInputChange={onInputChange}
          />
        )
      case "cybersecurity":
        return (
          <CybersecurityForm 
            formData={formData}
            onInputChange={onInputChange}
          />
        )
      case "freelancer":
        return (
          <FreelancerForm 
            formData={formData}
            onInputChange={onInputChange}
          />
        )
      case "exit_planner":
        return (
          <ExitPlannerForm 
            formData={formData}
            onInputChange={onInputChange}
          />
        )
      default:
        return <GenericForm formData={formData} onInputChange={onInputChange} />
    }
  }

  const GenericForm = ({ formData, onInputChange }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">Full Name</label>
          <input
            id="name"
            value={formData.name || ""}
            onChange={(e) => onInputChange("name", e.target.value)}
            placeholder="Your full name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            value={formData.email || ""}
            onChange={(e) => onInputChange("email", e.target.value)}
            placeholder="your@email.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="experience" className="text-sm font-medium">Years of Experience</label>
        <select
          id="experience"
          value={formData.experience || ""}
          onChange={(e) => onInputChange("experience", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select experience level</option>
          <option value="0-1">0-1 years</option>
          <option value="2-5">2-5 years</option>
          <option value="5-10">5-10 years</option>
          <option value="10+">10+ years</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="skills" className="text-sm font-medium">Skills/Expertise</label>
        <input
          id="skills"
          value={formData.skills || ""}
          onChange={(e) => onInputChange("skills", e.target.value)}
          placeholder="Your key skills"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="location" className="text-sm font-medium">Location</label>
        <input
          id="location"
          value={formData.location || ""}
          onChange={(e) => onInputChange("location", e.target.value)}
          placeholder="City, Country"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="bio" className="text-sm font-medium">Bio</label>
        <textarea
          id="bio"
          value={formData.bio || ""}
          onChange={(e) => onInputChange("bio", e.target.value)}
          placeholder="Tell us about yourself and what you're looking for..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="portfolioUrl" className="text-sm font-medium">Portfolio/Website (Optional)</label>
        <input
          id="portfolioUrl"
          value={formData.portfolioUrl || ""}
          onChange={(e) => onInputChange("portfolioUrl", e.target.value)}
          placeholder="https://your-website.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
    </div>
  )

  const getFormDescription = () => {
    switch (selectedRole) {
      case "founder":
        return "Tell us about your startup and what you're building"
      case "investor":
        return "Share your investment criteria and preferences"
      case "accelerator":
        return "Tell us about your accelerator program and what you offer"
      case "executive":
        return "Share your executive background and expertise"
      case "legal":
        return "Describe your legal expertise and services"
      case "government":
        return "Tell us about your government role and focus areas"
      case "cybersecurity":
        return "Share your cybersecurity expertise and services"
      case "freelancer":
        return "Describe your freelance services and availability"
      case "mentor_research":
        return "Tell us about your research and mentoring experience"
      case "exit_planner":
        return "Share your exit planning expertise and services"
      default:
        return "Fill in your details to get matched with the right people"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="inline-flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Role Selection
          </Button>
          <Badge variant="secondary" className="flex items-center">
            {selectedRoleData && <selectedRoleData.icon className="h-4 w-4 mr-2" />}
            {selectedRoleData?.label}
          </Badge>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
            <CardDescription>
              {getFormDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderRoleSpecificForm()}
            
            {/* Submit button for non-investor roles (investor form has its own submit button) */}
            {selectedRole !== "investor" && (
              <div className="pt-6">
                <Button 
                  onClick={onSubmit} 
                  disabled={isLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Profile...
                    </div>
                  ) : (
                    "Complete Profile Setup"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default FormWrapper
