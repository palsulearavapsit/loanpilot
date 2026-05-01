export type LoanStatus = 'PENDING' | 'ID_VERIFIED' | 'INTERVIEW_COMPLETE' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: 'applicant' | 'admin';
  created_at: string;
}

export interface LoanApplication {
  id: string;
  user_id: string;
  status: LoanStatus;
  amount: number | null;
  purpose: string | null;
  monthly_income: number | null;
  employment_type: string | null;
  id_type: string | null;
  id_number_last4: string | null;
  risk_score: number | null;
  decision_rationale: any;
  created_at: string;
}

export interface VerificationLog {
  id: string;
  session_id: string;
  event_type: 'FACE_MATCH' | 'LIVENESS' | 'EMOTION' | 'OCR' | 'CONSENT';
  status: 'SUCCESS' | 'FAILED' | 'FLAGGED';
  payload: any;
  created_at: string;
}
