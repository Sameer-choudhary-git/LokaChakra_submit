import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import ArrayInput from "../ArrayInput"

const GovernmentForm = ({ formData, onInputChange }) => {
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
            placeholder="e.g. Authority"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">Department*</Label>
          <Input
            id="department"
            value={formData.department || ""}
            onChange={(e) => onInputChange("department", e.target.value)}
            placeholder="e.g. Grant Body"
            required
          />
        </div>
      </div>

      {/* Regulatory Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="domain">Domains Regulated*</Label>
          <ArrayInput
            value={formData.domain || []}
            onChange={(value) => onInputChange("domain", value)}
            placeholder="e.g. Healthcare, Cybersecurity, Tech Policy (comma-separated)"
            maxItems={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="orgType">Organization Type*</Label>
          <Input
            id="orgType"
            value={formData.orgType || ""}
            onChange={(e) => onInputChange("orgType", e.target.value)}
            placeholder="e.g. Agency, Ministry, Regulatory Body"
            required
          />
        </div>
      </div>

      {/* Position and Experience */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="position">Position*</Label>
          <Input
            id="position"
            value={formData.position || ""}
            onChange={(e) => onInputChange("position", e.target.value)}
            placeholder="e.g. Head, Director, Senior Officer"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="yearsActive">Years Active*</Label>
          <Input
            id="yearsActive"
            type="number"
            value={formData.yearsActive || ""}
            onChange={(e) => onInputChange("yearsActive", parseInt(e.target.value) || 0)}
            placeholder="e.g. 1"
            required
          />
        </div>
      </div>

      {/* Past Challenges */}
      <div className="space-y-2">
        <Label htmlFor="challenges">Past Challenges</Label>
        <Textarea
          id="challenges"
          value={formData.challenges || ""}
          onChange={(e) => onInputChange("challenges", e.target.value)}
          placeholder="e.g. Regulatory compliance, cross-department coordination"
          rows={3}
        />
      </div>

      {/* Collaboration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="collabOrgs">Collaboration Organizations</Label>
          <ArrayInput
            value={formData.collabOrgs || []}
            onChange={(value) => onInputChange("collabOrgs", value)}
            placeholder="e.g. Startups, NGOs, Universities (comma-separated)"
            maxItems={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dashboardsUsed">Dashboards Used</Label>
          <ArrayInput
            value={formData.dashboardsUsed || []}
            onChange={(value) => onInputChange("dashboardsUsed", value)}
            placeholder="e.g. Govt Portal, Analytics Platform (comma-separated)"
            maxItems={6}
          />
        </div>
      </div>

      {/* Policy Research and Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="policyResearchInterest">Interested in Policy Research Match?</Label>
          <Select onValueChange={(value) => onInputChange("policyResearchInterest", value === "true")} value={formData.policyResearchInterest ? "true" : "false"}>
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
          <Label htmlFor="focus">Focus Area*</Label>
          <Input
            id="focus"
            value={formData.focus || ""}
            onChange={(e) => onInputChange("focus", e.target.value)}
            placeholder="e.g. Policy-making, Regulation, Innovation"
            required
          />
        </div>
      </div>

      {/* Collaboration Style and Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="collabStyle">Collaboration Style</Label>
          <Input
            id="collabStyle"
            value={formData.collabStyle || ""}
            onChange={(e) => onInputChange("collabStyle", e.target.value)}
            placeholder="e.g. Open Network, Formal Partnerships"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timeline">Start Timeline</Label>
          <Input
            id="timeline"
            value={formData.timeline || ""}
            onChange={(e) => onInputChange("timeline", e.target.value)}
            placeholder="e.g. 1-3 months, Immediate, 6 months"
          />
        </div>
      </div>

      {/* Impact Evaluation */}
      <div className="space-y-2">
        <Label htmlFor="impactEvaluation">Impact Evaluation Approach</Label>
        <Textarea
          id="impactEvaluation"
          value={formData.impactEvaluation || ""}
          onChange={(e) => onInputChange("impactEvaluation", e.target.value)}
          placeholder="e.g. KPI tracking, stakeholder feedback, quarterly reviews"
          rows={3}
        />
      </div>

      {/* Partnership Constraints */}
      <div className="space-y-2">
        <Label htmlFor="constraints">Partnership Constraints</Label>
        <Textarea
          id="constraints"
          value={formData.constraints || ""}
          onChange={(e) => onInputChange("constraints", e.target.value)}
          placeholder="e.g. Regulatory compliance requirements, budget limitations"
          rows={3}
        />
      </div>
    </div>
  )
}

export default GovernmentForm
