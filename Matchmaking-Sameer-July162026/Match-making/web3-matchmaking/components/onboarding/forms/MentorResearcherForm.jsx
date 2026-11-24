import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import ArrayInput from "../ArrayInput"

const MentorResearchForm = ({ formData, onInputChange }) => {
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
            placeholder="e.g. Kelsey Thomas"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role*</Label>
          <Input
            id="role"
            value={formData.role || ""}
            onChange={(e) => onInputChange("role", e.target.value)}
            placeholder="e.g. Mentor Researcher"
            required
          />
        </div>
      </div>

      {/* Professional Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="field">Primary Field*</Label>
          <Input
            id="field"
            value={formData.field || ""}
            onChange={(e) => onInputChange("field", e.target.value)}
            placeholder="e.g. Policy, Research, Academia"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mentorshipOpenTo">Mentorship Open To*</Label>
          <ArrayInput
            value={formData.mentorshipOpenTo || []}
            onChange={(value) => onInputChange("mentorshipOpenTo", value)}
            placeholder="e.g. Individuals, Teams, Students (comma-separated)"
            maxItems={5}
          />
        </div>
      </div>

      {/* Mentoring Style and Research */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="mentoringStyle">Mentoring Style Options*</Label>
          <ArrayInput
            value={formData.mentoringStyle || []}
            onChange={(value) => onInputChange("mentoringStyle", value)}
            placeholder="e.g. 1:1, Group, Workshops (comma-separated)"
            maxItems={5}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="researchOutputs">Research Outputs</Label>
          <ArrayInput
            value={formData.researchOutputs || []}
            onChange={(value) => onInputChange("researchOutputs", value)}
            placeholder="e.g. Policy Recs, Papers, Reports (comma-separated)"
            maxItems={8}
          />
        </div>
      </div>

      {/* Impact and Collaboration */}
      <div className="space-y-2">
        <Label htmlFor="impact">Desired Impact</Label>
        <Textarea
          id="impact"
          value={formData.impact || ""}
          onChange={(e) => onInputChange("impact", e.target.value)}
          placeholder="e.g. Policy influence, knowledge transfer, capacity building"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="collabWanted">Collaborators Wanted</Label>
          <ArrayInput
            value={formData.collabWanted || []}
            onChange={(value) => onInputChange("collabWanted", value)}
            placeholder="e.g. Students, Peers, Industry Experts (comma-separated)"
            maxItems={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectInterest">Joint Projects Interest</Label>
          <ArrayInput
            value={formData.projectInterest || []}
            onChange={(value) => onInputChange("projectInterest", value)}
            placeholder="e.g. Research Collaboration, Pilots, Policy Work (comma-separated)"
            maxItems={8}
          />
        </div>
      </div>

      {/* Tools and Availability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="toolsDatasets">Tools/Datasets Used</Label>
          <ArrayInput
            value={formData.toolsDatasets || []}
            onChange={(value) => onInputChange("toolsDatasets", value)}
            placeholder="e.g. GitHub, TensorFlow, SPSS, R (comma-separated)"
            maxItems={10}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="availability">Availability*</Label>
          <Input
            id="availability"
            value={formData.availability || ""}
            onChange={(e) => onInputChange("availability", e.target.value)}
            placeholder="e.g. Monthly, Weekly, Bi-weekly"
            required
          />
        </div>
      </div>

      {/* Communication and Compensation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="commStyle">Communication with Mentees</Label>
          <Input
            id="commStyle"
            value={formData.commStyle || ""}
            onChange={(e) => onInputChange("commStyle", e.target.value)}
            placeholder="e.g. Chat, Video Calls, Email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="compensation">Paid or Voluntary*</Label>
          <Select onValueChange={(value) => onInputChange("compensation", value)} value={formData.compensation}>
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Voluntary">Voluntary</SelectItem>
              <SelectItem value="Both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mentee Growth Tracking */}
      <div className="space-y-2">
        <Label htmlFor="growthTracking">Track Mentee Growth</Label>
        <Textarea
          id="growthTracking"
          value={formData.growthTracking || ""}
          onChange={(e) => onInputChange("growthTracking", e.target.value)}
          placeholder="e.g. Goal setting, progress reviews, milestone tracking"
          rows={3}
        />
      </div>

      {/* Mentor Challenges */}
      <div className="space-y-2">
        <Label htmlFor="challenges">Mentor Challenges</Label>
        <Textarea
          id="challenges"
          value={formData.challenges || ""}
          onChange={(e) => onInputChange("challenges", e.target.value)}
          placeholder="e.g. Time management, finding suitable mentees, measuring impact"
          rows={3}
        />
      </div>
    </div>
  )
}

export default MentorResearchForm
