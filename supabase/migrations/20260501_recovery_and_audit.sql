-- Update onboarding_sessions table
ALTER TABLE onboarding_sessions 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS current_step TEXT,
ADD COLUMN IF NOT EXISTS payload JSONB,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS recovery_sent_at TIMESTAMP WITH TIME ZONE;

-- Create audit_logs table for Phase 5
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  content_hash TEXT, -- SHA-256 hash for immutability
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Insert-only policy for audit_logs (Compliance integrity)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Applicants can insert own audit logs') THEN
        CREATE POLICY "Applicants can insert own audit logs" ON audit_logs 
        FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM loan_applications WHERE id = application_id AND user_id = auth.uid())
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all audit logs') THEN
        CREATE POLICY "Admins can view all audit logs" ON audit_logs 
        FOR SELECT USING (public.is_admin());
    END IF;
END
$$;

-- Function to update last_active_at
CREATE OR REPLACE FUNCTION update_session_heartbeat(session_id UUID, step TEXT, data JSONB, phone TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE onboarding_sessions
  SET 
    current_step = step,
    payload = data,
    phone_number = COALESCE(phone, phone_number),
    last_active_at = CURRENT_TIMESTAMP
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_cron and pg_net if available
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Schedule the recovery check every hour
-- Note: Replace with actual URL and key in production
SELECT cron.schedule('whatsapp-recovery-job', '0 * * * *', 
  $$ SELECT net.http_post(
       url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/whatsapp-recovery',
       headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
     ) $$
);

-- Create audit-vault bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('audit-vault', 'audit-vault', false) ON CONFLICT (id) DO NOTHING;

-- RLS for audit-vault
CREATE POLICY "Users can upload to their application folder" ON storage.objects 
FOR INSERT WITH CHECK (
 bucket_id = 'audit-vault' AND (storage.foldername(name))[1] IN (
 SELECT id::text FROM loan_applications WHERE user_id = auth.uid()
 )
);

CREATE POLICY "Admins can view all audit vault objects" ON storage.objects 
FOR SELECT USING (
 bucket_id = 'audit-vault' AND public.is_admin()
);
