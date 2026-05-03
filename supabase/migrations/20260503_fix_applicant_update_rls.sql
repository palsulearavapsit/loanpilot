-- ============================================================
-- Fix: Allow applicants to UPDATE their own loan_applications
-- This was the root cause of all silent data loss:
-- geo, risk_score, status, amount, decision_rationale never
-- actually saved because the applicant had INSERT-only RLS.
-- ============================================================

-- 1. Allow applicants to update their own application row
DROP POLICY IF EXISTS "Applicants can update own applications" ON loan_applications;
CREATE POLICY "Applicants can update own applications" ON loan_applications
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Add image_path column to loan_applications for storing the ID doc photo path
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS image_path TEXT;

-- 3. Add geo_location to loan_applications directly (convenience column)
--    The onboarding_sessions table also has it, but we need it directly accessible.
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS geo_location JSONB;

-- 4. Allow applicants to update their own profile (for OCR name sync)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Add tenure column for storing selected loan tenure
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS tenure INTEGER;
