/**
 * Company profile related types
 */

// Company (employer) profile
interface _CompanyDetails {
  name: string;
  email: string;
  logoUrl?: string;
  address: string;
  contactNumber: string;
  website?: string;
  industry: string;
  issuedCertificates?: string[]; // Array of certificate IDs => redundant but useful
  templates?: string[]; // Array of template IDs => redundant but useful
  employees?: string[]; // Array of employee IDs  => redundant but useful
}

export interface CompanyProfile {
  authority: string; // Solana public key
  companyId: string;
  CompanyDetails: string; // cid // CompanyDetails
  totalEmployees: number;
  totalCertificates: number;
  totalTemplates: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}
