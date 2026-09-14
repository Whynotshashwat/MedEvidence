export interface User {
  id: string;
  username: string;
  full_name: string;
  role: "admin" | "superadmin" | "doctor" | "nurse" | "auditor";
  created_at: string;
}

export interface Patient {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  dob: string;
  sex: "M" | "F" | "Other" | null;
  created_at: string;
}

export interface PatientWithCases extends Patient {
  case_count: number;
  cases: CaseSummary[];
}

export interface CaseSummary {
  id: string;
  case_number: string;
  status: CaseStatus;
  created_at: string;
}

export type CaseStatus = "open" | "escalated" | "resolved" | "closed";

export interface CaseDetail {
  id: string;
  patient_id: string;
  case_number: string;
  status: CaseStatus;
  created_by: string;
  first_name: string;
  last_name: string;
  mrn: string;
  dob: string;
  sex: string;
  created_by_name: string;
  vitals: VitalsRecord[];
  recommendations: Recommendation[];
  evidence: EvidenceRecord[];
  is_tampered: boolean;
}

export interface CaseListItem extends CaseSummary {
  patient_id: string;
  first_name: string;
  last_name: string;
  mrn: string;
  score: number | null;
  recommend: string | null;
  record_id: string | null;
  binding_hash: string | null;
}

export interface VitalsRecord {
  id: string;
  case_id: string;
  heart_rate: number;
  resp_rate: number;
  temp: number;
  systolic_bp: number;
  recorded_at: string;
}

export interface Recommendation {
  id: string;
  case_id: string;
  score: number;
  recommend: string;
  model_version: string;
  created_at: string;
}

export interface EvidenceRecord {
  id: string;
  case_id: string;
  record_id: string;
  execution_id: string;
  digest: string;
  binding_hash: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  username: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface DashboardData {
  stats: {
    totalPatients: number;
    totalCases: number;
    openCases: number;
    escalatedCases: number;
    resolvedCases: number;
    totalEvidence: number;
  };
  recentCases: CaseListItem[];
  recentAudit: AuditLog[];
}

export interface VerifyResult {
  ok: boolean;
  checks: Record<string, { status: "pass" | "fail"; detail?: string }>;
  reasons?: string[];
  subject?: {
    record_id?: string;
    key_id?: string;
    issued_at?: string;
  };
  receipt?: any;
}
