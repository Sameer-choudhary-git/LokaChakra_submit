// components/onboarding/forms/FounderForm.jsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import ArrayInput from "../ArrayInput"

const FounderForm = ({ formData, onInputChange }) => {
  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Your Name*</Label>
          <Input
            id="name"
            value={formData.name || ""}
            onChange={(e) => onInputChange("name", e.target.value)}
            placeholder="Enter your full name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Your Role*</Label>
          <Input
            id="role"
            value={formData.role || ""}
            onChange={(e) => onInputChange("role", e.target.value)}
            placeholder="e.g. Founder, Co-Founder, CEO"
            required
          />
        </div>
      </div>

      {/* Startup Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startupName">Startup Name*</Label>
          <Input
            id="startupName"
            value={formData.startupName || ""}
            onChange={(e) => onInputChange("startupName", e.target.value)}
            placeholder="e.g. ChainMed Solutions"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stage">Startup Stage*</Label>
          <Select onValueChange={(value) => onInputChange("stage", value)} value={formData.stage}>
            <SelectTrigger>
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Idea">Idea</SelectItem>
              <SelectItem value="MVP">MVP</SelectItem>
              <SelectItem value="Revenue-generating">Revenue-generating</SelectItem>
              <SelectItem value="Scaling">Scaling</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Business Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="domain">Domain(s)*</Label>
          <ArrayInput
            value={formData.domain || []}
            onChange={(value) => onInputChange("domain", value)}
            placeholder="e.g. HealthTech, Blockchain, FinTech"
            maxItems={5}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="biggestChallenge">Biggest Challenge*</Label>
          <Input
            id="biggestChallenge"
            value={formData.biggestChallenge || ""}
            onChange={(e) => onInputChange("biggestChallenge", e.target.value)}
            placeholder="e.g. Market Access, User Acquisition"
            required
          />
        </div>
      </div>

      {/* Team and Collaboration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="collaboratorsNeeded">Collaborators Needed*</Label>
          <ArrayInput
            value={formData.collaboratorsNeeded || []}
            onChange={(value) => onInputChange("collaboratorsNeeded", value)}
            placeholder="e.g. Investors, Technical Experts, Advisors"
            maxItems={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="seeking">Currently Seeking*</Label>
          <Input
            id="seeking"
            value={formData.seeking || ""}
            onChange={(e) => onInputChange("seeking", e.target.value)}
            placeholder="e.g. Investments, Partnerships, Mentoring"
            required
          />
        </div>
      </div>

      {/* Growth Goals */}
      <div className="space-y-2">
        <Label htmlFor="growthGoals12m">12-Month Growth Goals*</Label>
        <Textarea
          id="growthGoals12m"
          value={formData.growthGoals12m || ""}
          onChange={(e) => onInputChange("growthGoals12m", e.target.value)}
          placeholder="e.g. Enter 3 new regional markets, hire 10 team members, achieve $1M ARR"
          rows={3}
          required
        />
      </div>

      {/* Funding and Business Model */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="interestedInAccel">Interested in Accelerator?</Label>
          <Select onValueChange={(value) => onInputChange("interestedInAccel", value === "true")} value={formData.interestedInAccel ? "true" : "false"}>
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferredModel">Preferred Business Model*</Label>
          <Input
            id="preferredModel"
            value={formData.preferredModel || ""}
            onChange={(e) => onInputChange("preferredModel", e.target.value)}
            placeholder="e.g. SaaS, Marketplace, Revenue-share"
            required
          />
        </div>
      </div>

      {/* Technical and Hiring */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="techStack">Tech Stack*</Label>
          <ArrayInput
            value={formData.techStack || []}
            onChange={(value) => onInputChange("techStack", value)}
            placeholder="e.g. React, Node.js, PostgreSQL, AWS"
            maxItems={10}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hiringNeeds">Hiring Needs*</Label>
          <ArrayInput
            value={formData.hiringNeeds || []}
            onChange={(value) => onInputChange("hiringNeeds", value)}
            placeholder="e.g. Frontend Developer, Marketing Lead"
            maxItems={8}
          />
        </div>
      </div>

      {/* Financial Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fundingNeededUSD">Funding Needed (USD)*</Label>
          <Input
            id="fundingNeededUSD"
            type="number"
            value={formData.fundingNeededUSD || ""}
            onChange={(e) => onInputChange("fundingNeededUSD", parseInt(e.target.value) || 0)}
            placeholder="e.g. 500000"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location*</Label>
          <Input
            id="location"
            value={formData.location || ""}
            onChange={(e) => onInputChange("location", e.target.value)}
            placeholder="e.g. San Francisco, CA"
            required
          />
        </div>
      </div>

      {/* Support and Product */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="previousSupportUsed">Previous Support Used</Label>
          <ArrayInput
            value={formData.previousSupportUsed || []}
            onChange={(value) => onInputChange("previousSupportUsed", value)}
            placeholder="e.g. Incubator, Mentorship Program, Gov Scheme"
            maxItems={6}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="productType">Product Type*</Label>
          <Input
            id="productType"
            value={formData.productType || ""}
            onChange={(e) => onInputChange("productType", e.target.value)}
            placeholder="e.g. SaaS, Marketplace, Tokenized App"
            required
          />
        </div>
      </div>

      {/* Team and Funding Stage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="coFounderNeed">Co-Founder Needed?</Label>
          <Select onValueChange={(value) => onInputChange("coFounderNeed", value === "true")} value={formData.coFounderNeed ? "true" : "false"}>
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fundraisingStage">Fundraising Stage*</Label>
          <Select onValueChange={(value) => onInputChange("fundraisingStage", value)} value={formData.fundraisingStage}>
            <SelectTrigger>
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pre-seed">Pre-seed</SelectItem>
              <SelectItem value="seed">Seed</SelectItem>
              <SelectItem value="series-a">Series A</SelectItem>
              <SelectItem value="series-b">Series B</SelectItem>
              <SelectItem value="later-stage">Later Stage</SelectItem>
              <SelectItem value="not-fundraising">Not Currently Fundraising</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Traction Summary */}
      <div className="space-y-2">
        <Label htmlFor="tractionSummary">Traction Summary*</Label>
        <Textarea
          id="tractionSummary"
          value={formData.tractionSummary || ""}
          onChange={(e) => onInputChange("tractionSummary", e.target.value)}
          placeholder="e.g. 10,000 active users, $50K MRR, partnerships with 3 enterprises, featured in TechCrunch"
          rows={3}
          required
        />
      </div>
    </div>
  )
}

export default FounderForm
