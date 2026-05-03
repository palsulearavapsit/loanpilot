import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const { application_id, status, payload } = await req.json()

    // 1. Fetch user's profile and application data
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: app } = await supabase
      .from('loan_applications')
      .select('*, profiles(email, full_name)')
      .eq('id', application_id)
      .single()

    if (!app) throw new Error("Application not found")

    // 2. Prepare Webhook Payload for External Bank System
    const webhookPayload = {
      event: `loan_application.${status.toLowerCase()}`,
      timestamp: new Date().toISOString(),
      data: {
        application_id,
        applicant_name: app.profiles.full_name,
        applicant_email: app.profiles.email,
        amount: app.amount,
        risk_score: app.risk_score,
        metadata: payload
      }
    }

    // 3. Notify External System (Mock)
    const EXTERNAL_WEBHOOK_URL = Deno.env.get("EXTERNAL_WEBHOOK_URL")
    if (EXTERNAL_WEBHOOK_URL) {
      await fetch(EXTERNAL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-LoanPilot-Signature': 'LP_SIGN_77' },
        body: JSON.stringify(webhookPayload)
      })
    }

    console.log(`Webhook sent for ${application_id}: ${status}`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
