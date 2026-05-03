import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const { user_id } = await req.json()

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Fetch ALL data related to the user for GDPR compliance
    const [profile, applications, sessions, logs] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user_id).single(),
      supabase.from('loan_applications').select('*').eq('user_id', user_id),
      supabase.from('onboarding_sessions').select('*, loan_applications!inner(user_id)').eq('loan_applications.user_id', user_id),
      supabase.from('verification_logs').select('*, loan_applications!inner(user_id)').eq('loan_applications.user_id', user_id)
    ])

    const exportData = {
      user_profile: profile.data,
      applications: applications.data,
      sessions: sessions.data,
      verification_history: logs.data,
      exported_at: new Date().toISOString(),
      disclaimer: "This data is provided for GDPR compliance and contains all personal information held by LoanPilot."
    }

    return new Response(JSON.stringify(exportData), {
      headers: { 
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="loanpilot-data-export-${user_id}.json"`
      },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
