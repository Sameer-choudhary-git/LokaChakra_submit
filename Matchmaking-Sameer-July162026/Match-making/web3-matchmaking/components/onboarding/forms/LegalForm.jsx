import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import ArrayInput from "../ArrayInput"

const LegalForm = ({ formData, onInputChange }) => {
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
            placeholder="e.g. Cheryl Herrera"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Current Role*</Label>
          <Input
            id="role"
            value={formData.role || ""}
            onChange={(e) => onInputChange("role", e.target.value)}
            placeholder="e.g. Auditor, Legal Counsel, Partner"
            required
          />
        </div>
      </div>

      {/* Specialization and Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="specialization">Specialization Areas*</Label>
          <ArrayInput
            value={formData.specialization || []}
            onChange={(value) => onInputChange("specialization", value)}
            placeholder="e.g. Crypto Compliance, IP, Corporate Law (comma-separated)"
            maxItems={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="toolsUsed">Tools Used</Label>
          <ArrayInput
            value={formData.toolsUsed || []}
            onChange={(value) => onInputChange("toolsUsed", value)}
            placeholder="e.g. Custom ERP, LexisNexis, Westlaw (comma-separated)"
            maxItems={10}
          />
        </div>
      </div>

      {/* Service Offerings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="offerings">Looking to Offer</Label>
          <ArrayInput
            value={formData.offerings || []}
            onChange={(value) => onInputChange("offerings", value)}
            placeholder="e.g. Legal Advisory, Compliance, Document Review (comma-separated)"
            maxItems={6}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startupExperience">Startup Advisory Experience?</Label>
          <Select onValueChange={(value) => onInputChange("startupExperience", value === "true")} value={formData.startupExperience ? "true" : "false"}>
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

      {/* Industry and Engagement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="industries">Industry Sectors</Label>
          <ArrayInput
            value={formData.industries || []}
            onChange={(value) => onInputChange("industries", value)}
            placeholder="e.g. Tech, Healthcare, FinTech (comma-separated)"
            maxItems={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="engagementMode">Engagement Mode*</Label>
          <Input
            id="engagementMode"
            value={formData.engagementMode || ""}
            onChange={(e) => onInputChange("engagementMode", e.target.value)}
            placeholder="e.g. Retainer, Project-based, Hourly"
            required
          />
        </div>
      </div>

      {/* Mentorship and Challenges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="mentorshipAvailable">Available for Mentorship?</Label>
          <Select onValueChange={(value) => onInputChange("mentorshipAvailable", value === "true")} value={formData.mentorshipAvailable ? "true" : "false"}>
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
          <Label htmlFor="clientTypes">Client Types</Label>
          <ArrayInput
            value={formData.clientTypes || []}
            onChange={(value) => onInputChange("clientTypes", value)}
            placeholder="e.g. Corporates, Startups, Individuals (comma-separated)"
            maxItems={6}
          />
        </div>
      </div>

      {/* Common Challenges */}
      <div className="space-y-2">
        <Label htmlFor="challenges">Common Challenges</Label>
        <Textarea
          id="challenges"
          value={formData.challenges || ""}
          onChange={(e) => onInputChange("challenges", e.target.value)}
          placeholder="e.g. Regulatory compliance, contract negotiations, IP protection"
          rows={3}
        />
      </div>

      {/* Communication and Updates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="updateChannels">Preferred Update Channels</Label>
          <ArrayInput
            value={formData.updateChannels || []}
            onChange={(value) => onInputChange("updateChannels", value)}
            placeholder="e.g. Webinars, Newsletters, Bar Journals (comma-separated)"
            maxItems={5}
          />
        </div>
      </div>

      {/* Privacy Concerns */}
      <div className="space-y-2">
        <Label htmlFor="privacyConcerns">Privacy Concerns</Label>
        <Textarea
          id="privacyConcerns"
          value={formData.privacyConcerns || ""}
          onChange={(e) => onInputChange("privacyConcerns", e.target.value)}
          placeholder="e.g. Client confidentiality, data protection requirements"
          rows={3}
        />
      </div>
    </div>
  )
}

export default LegalForm
