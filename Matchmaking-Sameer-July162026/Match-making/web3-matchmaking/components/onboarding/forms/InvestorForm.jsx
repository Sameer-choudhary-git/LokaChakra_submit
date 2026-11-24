// components/onboarding/forms/InvestorForm.jsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import ArrayInput from "../ArrayInput"

const InvestorForm = ({ formData, onInputChange, onSubmit }) => {
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
            placeholder="e.g. Justin Wilson"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="organization">Organization*</Label>
          <Input
            id="organization"
            value={formData.organization || ""}
            onChange={(e) => onInputChange("organization", e.target.value)}
            placeholder="e.g. Robinson, Cooper and Nelson"
            required
          />
        </div>
      </div>

      {/* Investment Profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="investorType">Investor Type*</Label>
          <Select onValueChange={(value) => onInputChange("investorType", value)} value={formData.investorType}>
            <SelectTrigger>
              <SelectValue placeholder="Select investor type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VC">VC</SelectItem>
              <SelectItem value="Angel">Angel</SelectItem>
              <SelectItem value="PE">PE</SelectItem>
              <SelectItem value="Family Office">Family Office</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ticketSizeUSD">Typical Ticket Size (USD)*</Label>
          <ArrayInput
            value={formData.ticketSizeUSD || []}
            onChange={(value) => onInputChange("ticketSizeUSD", value.map(v => parseInt(v) || 0))}
            placeholder="e.g. 50000, 100000 (comma-separated range)"
            maxItems={2}
          />
        </div>
      </div>

      {/* Investment Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stageFocus">Stage Focus*</Label>
          <Input
            id="stageFocus"
            value={formData.stageFocus || ""}
            onChange={(e) => onInputChange("stageFocus", e.target.value)}
            placeholder="e.g. Pre-seed, Seed, Series A"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sectorFocus">Sector Focus*</Label>
          <ArrayInput
            value={formData.sectorFocus || []}
            onChange={(value) => onInputChange("sectorFocus", value)}
            placeholder="e.g. Fintech, AI, Healthcare"
            maxItems={8}
          />
        </div>
      </div>

      {/* Geographic and Co-investment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="geography">Geographic Focus*</Label>
          <Input
            id="geography"
            value={formData.geography || ""}
            onChange={(e) => onInputChange("geography", e.target.value)}
            placeholder="e.g. USA, India, Global"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="openToCoInvestment">Open to Co-Investment?*</Label>
          <Select onValueChange={(value) => onInputChange("openToCoInvestment", value === "true")} value={formData.openToCoInvestment ? "true" : "false"}>
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

      {/* Investment Strategy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="coInvestmentType">Co-Investment Type</Label>
          <ArrayInput
            value={formData.coInvestmentType || []}
            onChange={(value) => onInputChange("coInvestmentType", value)}
            placeholder="e.g. Syndicate, Direct, SPV"
            maxItems={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="involvementLevel">Preferred Involvement Level*</Label>
          <ArrayInput
            value={formData.involvementLevel || []}
            onChange={(value) => onInputChange("involvementLevel", value)}
            placeholder="e.g. Board Seat, Passive, Active Mentorship"
            maxItems={4}
          />
        </div>
      </div>

      {/* Evaluation and Discovery */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="evaluationCriteria">Key Evaluation Criteria*</Label>
          <ArrayInput
            value={formData.evaluationCriteria || []}
            onChange={(value) => onInputChange("evaluationCriteria", value)}
            placeholder="e.g. Team, Market Size, Traction, Technology"
            maxItems={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dealDiscovery">Deal Discovery Method*</Label>
          <Select onValueChange={(value) => onInputChange("dealDiscovery", value)} value={formData.dealDiscovery}>
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inbound">Inbound Applications</SelectItem>
              <SelectItem value="outbound">Outbound Sourcing</SelectItem>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="referrals">Network Referrals</SelectItem>
              <SelectItem value="events">Events & Conferences</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tools and Process */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="toolsUsed">Investment Tools Used</Label>
          <ArrayInput
            value={formData.toolsUsed || []}
            onChange={(value) => onInputChange("toolsUsed", value)}
            placeholder="e.g. Crunchbase, Pitchbook, Docsend"
            maxItems={6}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="legalPartnerModel">Legal Support Model</Label>
          <Input
            id="legalPartnerModel"
            value={formData.legalPartnerModel || ""}
            onChange={(e) => onInputChange("legalPartnerModel", e.target.value)}
            placeholder="e.g. In-house Legal, With Legal Partners"
          />
        </div>
      </div>

      {/* Deal Frequency and Portfolio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dealFrequency">Deal Frequency*</Label>
          <Input
            id="dealFrequency"
            value={formData.dealFrequency || ""}
            onChange={(e) => onInputChange("dealFrequency", e.target.value)}
            placeholder="e.g. 1-2 per quarter, 1 per month, Ad-hoc"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="portfolio">Notable Portfolio Companies</Label>
          <ArrayInput
            value={formData.portfolio || []}
            onChange={(value) => onInputChange("portfolio", value)}
            placeholder="e.g. Company A, Company B, Company C"
            maxItems={15}
          />
        </div>
      </div>

      {/* Value-Add Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="mentoringInterest">Offer Mentoring?*</Label>
          <Select onValueChange={(value) => onInputChange("mentoringInterest", value === "true")} value={formData.mentoringInterest ? "true" : "false"}>
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
          <Label htmlFor="advisoryInterest">Advisory Interest?*</Label>
          <Select onValueChange={(value) => onInputChange("advisoryInterest", value === "true")} value={formData.advisoryInterest ? "true" : "false"}>
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

      {/* Metrics and Impact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="metricsTracked">Key Metrics You Track*</Label>
          <ArrayInput
            value={formData.metricsTracked || []}
            onChange={(value) => onInputChange("metricsTracked", value)}
            placeholder="e.g. LTV, CAC, ARR, NPS, Retention"
            maxItems={10}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="impactAlignment">Impact/ESG Focus?</Label>
          <Select onValueChange={(value) => onInputChange("impactAlignment", value === "true")} value={formData.impactAlignment ? "true" : "false"}>
            <SelectTrigger>
              <SelectValue placeholder="Select alignment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Investment Philosophy */}
      <div className="space-y-2">
        <Label htmlFor="investmentPhilosophy">Investment Philosophy*</Label>
        <Textarea
          id="investmentPhilosophy"
          value={formData.investmentPhilosophy || ""}
          onChange={(e) => onInputChange("investmentPhilosophy", e.target.value)}
          placeholder="Describe your investment philosophy, what excites you about potential investments, and what value you bring beyond capital..."
          rows={4}
          required
        />
      </div>

      {/* Submit Button */}
      <div className="text-center pt-6">
        <Button 
          onClick={onSubmit} 
          className="bg-blue-500 hover:bg-blue-600 px-8 py-3 text-white font-semibold text-lg"
        >
          Complete Investor Profile
        </Button>
      </div>
    </div>
  )
}

export default InvestorForm
