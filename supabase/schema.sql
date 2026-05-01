-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Enum for application status
CREATE TYPE loan_status AS ENUM ('PENDING', 'ID_VERIFIED', 'INTERVIEW_COMPLETE', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- Profiles table (extending auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'applicant' CHECK (role IN ('applicant', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Loan Applications table
CREATE TABLE loan_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status loan_status DEFAULT 'PENDING',
  amount NUMERIC(15, 2),
  purpose TEXT,
  monthly_income NUMERIC(15, 2),
  employment_type TEXT,
  id_type TEXT,
  id_number_last4 TEXT,
  id_verified_at TIMESTAMP WITH TIME ZONE,
  interview_completed_at TIMESTAMP WITH TIME ZONE,
  risk_score INTEGER, -- 0 to 100
  decision_rationale JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Onboarding Sessions
CREATE TABLE onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  geo_location JSONB, -- { lat, lng, city, country }
  device_metadata JSONB, -- { browser, os, battery, screen }
  is_active BOOLEAN DEFAULT TRUE
);

-- Verification Logs (Audit Trail & AI Signals)
CREATE TABLE verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  session_id UUID REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'FACE_MATCH', 'LIVENESS', 'EMOTION', 'OCR', 'CONSENT'
  status TEXT NOT NULL, -- 'SUCCESS', 'FAILED', 'FLAGGED'
  payload JSONB, -- detailed signals or error messages
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Interview Transcripts
CREATE TABLE interview_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL, -- 'AI', 'USER'
  content TEXT NOT NULL,
  audio_url TEXT, -- reference to storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS POLICIES --

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_transcripts ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/write their own profile; admins can read all.
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Loan Applications: Applicants can read/write their own; admins all.
CREATE POLICY "Applicants can view own applications" ON loan_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Applicants can insert own applications" ON loan_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all applications" ON loan_applications FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Sessions: Restricted to session owner or admin.
CREATE POLICY "Applicants can view own sessions" ON onboarding_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM loan_applications WHERE id = application_id AND user_id = auth.uid())
);
CREATE POLICY "Applicants can insert own sessions" ON onboarding_sessions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM loan_applications WHERE id = application_id AND user_id = auth.uid())
);

-- Verification Logs: Restricted to session owner or admin.
CREATE POLICY "Applicants can view own logs" ON verification_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM loan_applications WHERE id = application_id AND user_id = auth.uid())
);
CREATE POLICY "Applicants can insert own logs" ON verification_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM loan_applications WHERE id = application_id AND user_id = auth.uid())
);

-- Interview Transcripts: Restricted to session owner or admin.
CREATE POLICY "Applicants can view own transcripts" ON interview_transcripts FOR SELECT USING (
  EXISTS (SELECT 1 FROM loan_applications WHERE id = application_id AND user_id = auth.uid())
);
CREATE POLICY "Applicants can insert own transcripts" ON interview_transcripts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM loan_applications WHERE id = application_id AND user_id = auth.uid())
);

-- Function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 'applicant');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- STORAGE POLICIES --
-- Allow authenticated users to upload to temp-kyc
INSERT INTO storage.buckets (id, name, public) VALUES ('temp-kyc', 'temp-kyc', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'temp-kyc' AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow owner select" ON storage.objects FOR SELECT USING (
  bucket_id = 'temp-kyc' AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow owner delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'temp-kyc' AND auth.role() = 'authenticated'
);
