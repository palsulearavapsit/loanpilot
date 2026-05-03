-- Fix recursion in profiles and other tables
-- Run this in Supabase SQL Editor

-- 1. Create the is_admin helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all applications" ON loan_applications;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit vault objects" ON storage.objects;

-- 3. Re-create admin policies using the helper function
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage all applications" ON loan_applications FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can view all audit logs" ON audit_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can view all audit vault objects" ON storage.objects FOR SELECT USING (
  bucket_id = 'audit-vault' AND public.is_admin()
);

-- 4. Fix missing UPDATE policy for onboarding_sessions
DROP POLICY IF EXISTS "Applicants can update own sessions" ON onboarding_sessions;
CREATE POLICY "Applicants can update own sessions" ON onboarding_sessions 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM loan_applications WHERE id = application_id AND user_id = auth.uid())
);

-- 5. Add Admin manage policy for sessions, logs and transcripts
DROP POLICY IF EXISTS "Admins can manage all sessions" ON onboarding_sessions;
CREATE POLICY "Admins can manage all sessions" ON onboarding_sessions FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all logs" ON verification_logs;
CREATE POLICY "Admins can manage all logs" ON verification_logs FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all transcripts" ON interview_transcripts;
CREATE POLICY "Admins can manage all transcripts" ON interview_transcripts FOR ALL USING (public.is_admin());
