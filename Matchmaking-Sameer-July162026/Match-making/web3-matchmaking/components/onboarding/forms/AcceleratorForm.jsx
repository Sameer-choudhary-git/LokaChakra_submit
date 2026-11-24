import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import ArrayInput from "../ArrayInput"

const AcceleratorForm = ({ formData, onInputChange }) => {
  return (
    <div className="space-y-6">
      {/* Organization Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Program/Organization Name*</Label>
          <Input
            id="name"
            value={formData.name || ""}
            onChange={(e) => onInputChange("name", e.target.value)}
            placeholder="e.g. Bryan and Sons"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startupTypes">Startup Types Focus*</Label>
          <ArrayInput
            value={formData.startupTypes || []}
            onChange={(value) => onInputChange("startupTypes", value)}
            placeholder="e.g. AI, FinTech, Social Impact (comma-separated)"
            maxItems={8}
          />
        </div>
      </div>

      {/* Services and Intake */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="servicesOffered">Services Offered*</Label>
          <ArrayInput
            value={formData.servicesOffered || []}
            onChange={(value) => onInputChange("servicesOffered", value)}
            placeholder="e.g. Office Space, Legal, Funding, Mentorship (comma-separated)"
            maxItems={10}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="intakeSize">Intake Size*</Label>
          <Input
            id="intakeSize"
            type="number"
            value={formData.intakeSize || ""}
            onChange={(e) => onInputChange("intakeSize", parseInt(e.target.value) || 0)}
            placeholder="e.g. 36"
            required
          />
        </div>
      </div>

      {/* Batch and Duration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="batchFrequency">Batch Frequency*</Label>
          <Select onValueChange={(value) => onInputChange("batchFrequency", value)} value={formData.batchFrequency}>
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Quarterly">Quarterly</SelectItem>
              <SelectItem value="Bi-annual">Bi-annual</SelectItem>
              <SelectItem value="Annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="programDuration">Program Duration*</Label>
          <Input
            id="programDuration"
            value={formData.programDuration || ""}
            onChange={(e) => onInputChange("programDuration", e.target.value)}
            placeholder="e.g. 6 months, 3 months, 1 year"
            required
          />
        </div>
      </div>

      {/* Stage Focus and Equity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stageFocus">Stage Focus*</Label>
          <ArrayInput
            value={formData.stageFocus || []}
            onChange={(value) => onInputChange("stageFocus", value)}
            placeholder="e.g. Idea, MVP, Early revenue, Scaling (comma-separated)"
            maxItems={6}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="equityTaken">Equity Taken?</Label>
          <Select onValueChange={(value) => onInputChange("equityTaken", value === "true")} value={formData.equityTaken ? "true" : "false"}>
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rejection and Selection Criteria */}
      <div className="space-y-2">
        <Label htmlFor="rejectCriteria">Rejection Criteria</Label>
        <Textarea
          id="rejectCriteria"
          value={formData.rejectCriteria || ""}
          onChange={(e) => onInputChange("rejectCriteria", e.target.value)}
          placeholder="e.g. Outside approach ok"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="selectionCriteria">Selection Criteria*</Label>
        <Textarea
          id="selectionCriteria"
          value={formData.selectionCriteria || ""}
          onChange={(e) => onInputChange("selectionCriteria", e.target.value)}
          placeholder="e.g. Institution use act own politics"
          rows={3}
          required
        />
      </div>

      {/* Focus and Delivery */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primaryFocus">Primary Focus*</Label>
          <Input
            id="primaryFocus"
            value={formData.primaryFocus || ""}
            onChange={(e) => onInputChange("primaryFocus", e.target.value)}
            placeholder="e.g. Product Development, Market Fit, Scaling"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deliveryMode">Delivery Mode*</Label>
          <Select onValueChange={(value) => onInputChange("deliveryMode", value)} value={formData.deliveryMode}>
            <SelectTrigger>
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="In-person">In-person</SelectItem>
              <SelectItem value="Remote">Remote</SelectItem>
              <SelectItem value="Hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Affiliations and Cross-Border */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="affiliations">Affiliations</Label>
          <ArrayInput
            value={formData.affiliations || []}
            onChange={(value) => onInputChange("affiliations", value)}
            placeholder="e.g. Govt Body, University, Corp Partner (comma-separated)"
            maxItems={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="crossBorderOps">Cross-Border Operations?</Label>
          <Select onValueChange={(value) => onInputChange("crossBorderOps", value === "true")} value={formData.crossBorderOps ? "true" : "false"}>
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Onboarding/Match Help */}
      <div className="space-y-2">
        <Label htmlFor="onboardingHelp">Onboarding/Match Help</Label>
        <Textarea
          id="onboardingHelp"
          value={formData.onboardingHelp || ""}
          onChange={(e) => onInputChange("onboardingHelp", e.target.value)}
          placeholder="e.g. How you help startups integrate or find matches"
          rows={3}
        />
      </div>
    </div>
  )
}

export default AcceleratorForm
