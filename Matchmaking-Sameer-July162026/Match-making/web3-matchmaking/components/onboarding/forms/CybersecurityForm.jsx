import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import ArrayInput from "../ArrayInput"

const CybersecurityForm = ({ formData, onInputChange }) => {
  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role">Role*</Label>
          <Input
            id="role"
            value={formData.role || ""}
            onChange={(e) => onInputChange("role", e.target.value)}
            placeholder="e.g. Cybersecurity"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Full Name*</Label>
          <Input
            id="name"
            value={formData.name || ""}
            onChange={(e) => onInputChange("name", e.target.value)}
            placeholder="e.g. John Knight"
            required
          />
        </div>
      </div>

      {/* Specialization and Domains */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="specializationAreas">Specialization Areas*</Label>
          <ArrayInput
            value={formData.specializationAreas || []}
            onChange={(value) => onInputChange("specializationAreas", value)}
            placeholder="e.g. DevOps, Security Audits (comma-separated)"
            maxItems={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="domain">Domain(s)*</Label>
          <ArrayInput
            value={formData.domain || []}
            onChange={(value) => onInputChange("domain", value)}
            placeholder="e.g. Cloud, Web3, Enterprise (comma-separated)"
            maxItems={6}
          />
        </div>
      </div>

      {/* Work Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gigPref">Gig Preference*</Label>
          <Input
            id="gigPref"
            value={formData.gigPref || ""}
            onChange={(e) => onInputChange("gigPref", e.target.value)}
            placeholder="e.g. Long-term Strategy, Short-term"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="objectives">Objectives*</Label>
          <ArrayInput
            value={formData.objectives || []}
            onChange={(value) => onInputChange("objectives", value)}
            placeholder="e.g. Learn, Share Expertise, Build Partnerships (comma-separated)"
            maxItems={6}
          />
        </div>
      </div>

      {/* Tools and Communication */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="toolsFrameworks">Tools/Frameworks*</Label>
          <ArrayInput
            value={formData.toolsFrameworks || []}
            onChange={(value) => onInputChange("toolsFrameworks", value)}
            placeholder="e.g. Nmap, Metasploit, AWS, Burp Suite (comma-separated)"
            maxItems={10}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="updateMethod">Preferred Update Method*</Label>
          <Input
            id="updateMethod"
            value={formData.updateMethod || ""}
            onChange={(e) => onInputChange("updateMethod", e.target.value)}
            placeholder="e.g. Conferences, Threat Feeds, CVE Lists"
            required
          />
        </div>
      </div>

      {/* Access and Mentorship */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="logAccessNeed">Require Log Access?</Label>
          <Select onValueChange={(value) => onInputChange("logAccessNeed", value === "true")} value={formData.logAccessNeed ? "true" : "false"}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mentorshipInterest">Interested in Mentorship?</Label>
          <Select onValueChange={(value) => onInputChange("mentorshipInterest", value === "true")} value={formData.mentorshipInterest ? "true" : "false"}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Certifications and Team Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="certifications">Certifications*</Label>
          <ArrayInput
            value={formData.certifications || []}
            onChange={(value) => onInputChange("certifications", value)}
            placeholder="e.g. AWS Sec, OSCP, CEH (comma-separated)"
            maxItems={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teamPref">Team Preference*</Label>
          <Input
            id="teamPref"
            value={formData.teamPref || ""}
            onChange={(e) => onInputChange("teamPref", e.target.value)}
            placeholder="e.g. Team-based, Independent"
            required
          />
        </div>
      </div>

      {/* Partnership Type */}
      <div className="space-y-2">
        <Label htmlFor="partnershipType">Preferred Partnership Type*</Label>
        <Input
          id="partnershipType"
          value={formData.partnershipType || ""}
          onChange={(e) => onInputChange("partnershipType", e.target.value)}
          placeholder="e.g. Informal, Formal MoU"
          required
        />
      </div>

      {/* Biggest Challenge */}
      <div className="space-y-2">
        <Label htmlFor="biggestChallenge">Biggest Challenge</Label>
        <Textarea
          id="biggestChallenge"
          value={formData.biggestChallenge || ""}
          onChange={(e) => onInputChange("biggestChallenge", e.target.value)}
          placeholder="e.g. Access control"
          rows={3}
        />
      </div>
    </div>
  )
}

export default CybersecurityForm
