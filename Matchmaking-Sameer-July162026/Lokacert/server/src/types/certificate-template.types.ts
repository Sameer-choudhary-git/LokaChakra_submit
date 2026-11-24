interface _CertificateTemplateDetails {
  name: string; // certificate name
  description?: string; // certificate description
  metadata_uri: string; // URI pointing to metadata JSON
  design_template_uri: string; // URI pointing to design template (e.g., SVG)
  is_active: boolean; // Is this template active
}

export interface CertificateTemplate {
  templateId: string;
  company: string; // id of the company who created this template
  certificateDetails: string; // cid //
  createdAt: string;
  updatedAt?: string;
}
