-- Seed Demo Users
-- Note: In a real Supabase environment, users must be created via auth.signUp()
-- This script assumes profiles will be linked to auth.users IDs manually or via dashboard.

-- 1. Create Demo Profiles
INSERT INTO public.profiles (id, full_name, email, role)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Admin Controller', 'admin@loanpilot.ai', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'Test Applicant', 'applicant@user.com', 'applicant')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Sample Loan Applications
INSERT INTO public.loan_applications (id, user_id, status, amount, purpose, monthly_income, employment_type, risk_score)
VALUES 
  (
    'a1111111-1111-1111-1111-111111111111', 
    '00000000-0000-0000-0000-000000000002', 
    'APPROVED', 
    500000.00, 
    'Home Renovation', 
    85000.00, 
    'Salaried', 
    15
  ),
  (
    'b2222222-2222-2222-2222-222222222222', 
    '00000000-0000-0000-0000-000000000002', 
    'REJECTED', 
    1200000.00, 
    'Business Expansion', 
    40000.00, 
    'Self-Employed', 
    82
  ),
  (
    'c3333333-3333-3333-3333-333333333333', 
    '00000000-0000-0000-0000-000000000002', 
    'UNDER_REVIEW', 
    250000.00, 
    'Medical Emergency', 
    60000.00, 
    'Contractor', 
    45
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Add Sample Decision Rationale
UPDATE public.loan_applications 
SET decision_rationale = '{
  "bureau_score": 782,
  "risk_breakdown": ["Verified ID", "Consistent interview responses"],
  "final_score": 85
}'
WHERE id = 'a1111111-1111-1111-1111-111111111111';
