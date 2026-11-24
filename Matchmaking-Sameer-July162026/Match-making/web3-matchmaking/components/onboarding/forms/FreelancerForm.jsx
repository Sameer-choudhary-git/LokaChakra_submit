import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import ArrayInput from "../ArrayInput"

const FreelancerForm = ({ formData, onInputChange }) => {
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
            placeholder="e.g. Freelancer"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name*</Label>
          <Input
            id="fullName"
            value={formData.fullName || ""}
            onChange={(e) => onInputChange("name", e.target.value)}
            placeholder="e.g. Carol Curry"
            required
          />
        </div>
      </div>

      {/* Expertise and Client Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expertiseArea">Expertise Area*</Label>
          <Input
            id="expertiseArea"
            value={formData.expertiseArea || ""}
            onChange={(e) => onInputChange("expertiseArea", e.target.value)}
            placeholder="e.g. Writing"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferredClients">Preferred Clients*</Label>
          <ArrayInput
            value={formData.preferredClients || []}
            onChange={(value) => onInputChange("preferredClients", value)}
            placeholder="e.g. Startups, Government (comma-separated)"
            maxItems={6}
          />
        </div>
      </div>

      {/* Work Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="workMode">Work Mode*</Label>
          <Input
            id="workMode"
            value={formData.workMode || ""}
            onChange={(e) => onInputChange("workMode", e.target.value)}
            placeholder="e.g. Part-time"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="experienceLevel">Experience Level*</Label>
          <Input
            id="experienceLevel"
            value={formData.experienceLevel || ""}
            onChange={(e) => onInputChange("experienceLevel", e.target.value)}
            placeholder="e.g. Junior"
            required
          />
        </div>
      </div>

      {/* Project and Platform Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="projectTimeline">Project Timeline*</Label>
          <Input
            id="projectTimeline"
            value={formData.projectTimeline || ""}
            onChange={(e) => onInputChange("projectTimeline", e.target.value)}
            placeholder="e.g. Ongoing"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="findingPlatforms">Finding Platforms*</Label>
          <ArrayInput
            value={formData.findingPlatforms || []}
            onChange={(value) => onInputChange("findingPlatforms", value)}
            placeholder="e.g. Upwork, Lokachakra (comma-separated)"
            maxItems={8}
          />
        </div>
      </div>

      {/* Communication and Team Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="commStyle">Communication Style</Label>
          <Input
            id="commStyle"
            value={formData.commStyle || ""}
            onChange={(e) => onInputChange("commStyle", e.target.value)}
            placeholder="e.g. Regular Syncs"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teamWork">Team Work Preference*</Label>
          <Input
            id="teamWork"
            value={formData.teamWork || ""}
            onChange={(e) => onInputChange("teamWork", e.target.value)}
            placeholder="e.g. Team"
            required
          />
        </div>
      </div>

      {/* Crypto and Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cryptoGigs">Open to Crypto Gigs?</Label>
          <Select onValueChange={(value) => onInputChange("cryptoGigs", value === "true")} value={formData.cryptoGigs ? "true" : "false"}>
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

      {/* Verification Preference */}
      <div className="space-y-2">
        <Label htmlFor="verificationPref">Verification Preference</Label>
        <Textarea
          id="verificationPref"
          value={formData.verificationPref || ""}
          onChange={(e) => onInputChange("verificationPref", e.target.value)}
          placeholder="e.g. Strategy from."
          rows={3}
        />
      </div>
    </div>
  )
}

export default FreelancerForm
