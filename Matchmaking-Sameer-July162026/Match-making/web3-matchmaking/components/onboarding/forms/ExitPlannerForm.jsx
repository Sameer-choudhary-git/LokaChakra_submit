import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import ArrayInput from "../ArrayInput"

const ExitPlannerForm = ({ formData, onInputChange }) => {
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
            placeholder="e.g. Exit Planner"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Full Name*</Label>
          <Input
            id="name"
            value={formData.name || ""}
            onChange={(e) => onInputChange("name", e.target.value)}
            placeholder="e.g. Natasha Brewer"
            required
          />
        </div>
      </div>

      {/* Focus and Deal Size */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="focus">Focus Side*</Label>
          <Input
            id="focus"
            value={formData.focus || ""}
            onChange={(e) => onInputChange("focus", e.target.value)}
            placeholder="e.g. Buy-side, Sell-side, Both"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dealSizeUSD">Deal Size Range (USD)*</Label>
          <ArrayInput
            value={formData.dealSizeUSD || []}
            onChange={(value) => onInputChange("dealSizeUSD", value.map(v => parseInt(v) || 0))}
            placeholder="e.g. 233782, 2370685 (comma-separated range)"
            maxItems={2}
          />
        </div>
      </div>

      {/* Team and Support */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="teamStructure">Team Structure*</Label>
          <Input
            id="teamStructure"
            value={formData.teamStructure || ""}
            onChange={(e) => onInputChange("teamStructure", e.target.value)}
            placeholder="e.g. Independent, Team-based, Hybrid"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supportNeeded">Support Needed*</Label>
          <ArrayInput
            value={formData.supportNeeded || []}
            onChange={(value) => onInputChange("supportNeeded", value)}
            placeholder="e.g. Business Dev, Valuation, Due Diligence (comma-separated)"
            maxItems={8}
          />
        </div>
      </div>

      {/* Transaction and Sectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="transactionType">Transaction Type*</Label>
          <ArrayInput
            value={formData.transactionType || []}
            onChange={(value) => onInputChange("transactionType", value)}
            placeholder="e.g. Immediate, Pipeline, Strategic (comma-separated)"
            maxItems={6}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sectors">Operating Sectors*</Label>
          <ArrayInput
            value={formData.sectors || []}
            onChange={(value) => onInputChange("sectors", value)}
            placeholder="e.g. Health, Manufacturing, Tech (comma-separated)"
            maxItems={10}
          />
        </div>
      </div>

      {/* Red Flags */}
      <div className="space-y-2">
        <Label htmlFor="redFlags">Red Flags</Label>
        <Textarea
          id="redFlags"
          value={formData.redFlags || ""}
          onChange={(e) => onInputChange("redFlags", e.target.value)}
          placeholder="e.g. Poor financial records, declining market, regulatory issues"
          rows={3}
        />
      </div>

      {/* Readiness Validation */}
      <div className="space-y-2">
        <Label htmlFor="readinessValidation">Readiness Validation</Label>
        <Textarea
          id="readinessValidation"
          value={formData.readinessValidation || ""}
          onChange={(e) => onInputChange("readinessValidation", e.target.value)}
          placeholder="e.g. Financial audit, market analysis, operational assessment"
          rows={3}
        />
      </div>

      {/* Deal Discovery and Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dealDiscovery">Deal Discovery Preference*</Label>
          <Input
            id="dealDiscovery"
            value={formData.dealDiscovery || ""}
            onChange={(e) => onInputChange("dealDiscovery", e.target.value)}
            placeholder="e.g. Inbound, Outbound, Network Referrals"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tools">Tools You Use*</Label>
          <ArrayInput
            value={formData.tools || []}
            onChange={(value) => onInputChange("tools", value)}
            placeholder="e.g. CapIQ, Pitchbook, Bloomberg (comma-separated)"
            maxItems={8}
          />
        </div>
      </div>

      {/* Partnership and Frequency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="partnershipWork">Work in Partnership?</Label>
          <Select onValueChange={(value) => onInputChange("partnershipWork", value === "true")} value={formData.partnershipWork ? "true" : "false"}>
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
          <Label htmlFor="dealFrequency">Deal Frequency</Label>
          <Input
            id="dealFrequency"
            value={formData.dealFrequency || ""}
            onChange={(e) => onInputChange("dealFrequency", e.target.value)}
            placeholder="e.g. Quarterly, Monthly, Ad-hoc"
          />
        </div>
      </div>

      {/* Support Expected */}
      <div className="space-y-2">
        <Label htmlFor="platformSupport">Support Expected from Platform</Label>
        <Textarea
          id="platformSupport"
          value={formData.platformSupport || ""}
          onChange={(e) => onInputChange("platformSupport", e.target.value)}
          placeholder="e.g. Deal flow, network connections, market intelligence"
          rows={3}
        />
      </div>
    </div>
  )
}

export default ExitPlannerForm
