/**
 * Employee profile related types
 */

// Employee basic details
interface EmployeeBasicDetails {
  fullName: string;
  personalEmail: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string; // ISO date string
  contactNumber: string;
  homeAddress: string;
  walletAddress: string; // Solana public key
  avatarUrl?: string;
}

interface EmployeeProfessionalDetails {
  workEmail: string;
  jobTitle: string;
  department: string;
  dateOfJoining: string; // ISO date string
  employeeId: string;
  workingLocation: string;
  currentStatus: 'active' | 'inactive';
  certificates?: string[]; // Array of certificate IDs issued to the employee
}

interface _EmployeeDetails {
  basic: EmployeeBasicDetails;
  professional: EmployeeProfessionalDetails;
}
enum EmployeeStatus {
  Pending,
  Active,
  Inactive,
}

export interface EmployeeProfile {
  wallet: string; // Solana public key
  company: string; // Solana public key
  email_hash: string; // sha256 hash of email
  EmployeeDetails: string; // cid // EmployeeDetails
  totalCertificates: number;
  confirmationToken: string; // For email confirmation
  status: EmployeeStatus;
  createdAt: string;
  updatedAt?: string; //  1762266514

  dateOfJoining?: string; //  ====== -1 / update at active ping
  dateofLeaving?: string; //  ===== -1 / update at inactive call
}
