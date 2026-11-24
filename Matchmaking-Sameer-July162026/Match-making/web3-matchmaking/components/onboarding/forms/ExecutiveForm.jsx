import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import ArrayInput from "../ArrayInput"

const ExecutiveForm = ({ formData, onInputChange }) => {
  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name*</Label>
          <Input
            id="name"
            value={formData.name || ""}
            onChange={(e) => onInputChange("name", e.target.value)}
            placeholder="e.g. Paul Willis"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Current Role*</Label>
          <Input
            id="role"
            value={formData.role || ""}
            onChange={(e) => onInputChange("role", e.target.value)}
            placeholder="e.g. COO, VP of Engineering"
            required
          />
        </div>
      </div>

      {/* Organization and KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="orgType">Organization Type*</Label>
          <Select onValueChange={(value) => onInputChange("orgType", value)} value={formData.orgType}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Startup">Startup</SelectItem>
              <SelectItem value="Corporation">Corporation</SelectItem>
              <SelectItem value="Non-profit">Non-profit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="keyKPIs">Key KPIs*</Label>
          <ArrayInput
            value={formData.keyKPIs || []}
            onChange={(value) => onInputChange("keyKPIs", value)}
            placeholder="e.g. Retention, User Acquisition, Revenue Growth (comma-separated)"
            maxItems={8}
          />
        </div>
      </div>

      {/* Partner Finding and Exploration */}
      <div className="space-y-2">
        <Label htmlFor="partnerFindingApproach">Partner Finding Approach</Label>
        <Textarea
          id="partnerFindingApproach"
          value={formData.partnerFindingApproach || ""}
          onChange={(e) => onInputChange("partnerFindingApproach", e.target.value)}
          placeholder="e.g. Network referrals, industry events, cold outreach"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="exploring">Currently Exploring*</Label>
          <ArrayInput
            value={formData.exploring || []}
            onChange={(value) => onInputChange("exploring", value)}
            placeholder="e.g. Partnerships, Acquisitions, Joint Ventures (comma-separated)"
            maxItems={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="techInterests">Tech Interests*</Label>
          <ArrayInput
            value={formData.techInterests || []}
            onChange={(value) => onInputChange("techInterests", value)}
            placeholder="e.g. Blockchain, AI, Cloud, IoT (comma-separated)"
            maxItems={10}
          />
        </div>
      </div>

      {/* Roles and Investment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="seeking">Seeking Roles*</Label>
          <ArrayInput
            value={formData.seeking || []}
            onChange={(value) => onInputChange("seeking", value)}
            placeholder="e.g. Talent, Advisors, Board Members (comma-separated)"
            maxItems={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="investMentorInterest">Interest in Investing/Mentoring*</Label>
          <ArrayInput
            value={formData.investMentorInterest || []}
            onChange={(value) => onInputChange("investMentorInterest", value)}
            placeholder="e.g. Angel Investing, Mentoring, Advisory (comma-separated)"
            maxItems={5}
          />
        </div>
      </div>

      {/* Firm Preference */}
      <div className="space-y-2">
        <Label htmlFor="firmPref">Firm Preference*</Label>
        <Input
          id="firmPref"
          value={formData.firmPref || ""}
          onChange={(e) => onInputChange("firmPref", e.target.value)}
          placeholder="e.g. Early Stage, Growth Stage, Enterprise"
          required
        />
      </div>

      {/* Industry Challenges */}
      <div className="space-y-2">
        <Label htmlFor="challenges">Industry Challenges</Label>
        <Textarea
          id="challenges"
          value={formData.challenges || ""}
          onChange={(e) => onInputChange("challenges", e.target.value)}
          placeholder="e.g. Talent acquisition, regulatory compliance, market competition"
          rows={3}
        />
      </div>

      {/* Delegation and Budget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="delegateAreas">Areas to Delegate*</Label>
          <ArrayInput
            value={formData.delegateAreas || []}
            onChange={(value) => onInputChange("delegateAreas", value)}
            placeholder="e.g. Tech, Marketing, Operations (comma-separated)"
            maxItems={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="budgetMandate">Budget Mandate*</Label>
          <Input
            id="budgetMandate"
            type="number"
            value={formData.budgetMandate || ""}
            onChange={(e) => onInputChange("budgetMandate", parseInt(e.target.value) || 0)}
            placeholder="e.g. 231981"
            required
          />
        </div>
      </div>
    </div>
  )
}

export default ExecutiveForm
