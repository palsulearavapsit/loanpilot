import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const { application_id } = await req.json()

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

    // Mock Email Sending logic
    // In production, use Resend, SendGrid, or Postmark
    const emailContent = `
      Hi ${app.profiles.full_name},
      
      Congratulations! Your loan application for ₹${app.amount.toLocaleString()} has been APPROVED.
      
      Your Risk Score: ${app.risk_score}/100
      Application ID: ${application_id}
      
      Our team will contact you within 24 hours for the disbursement process.
      
      Thank you for choosing LoanPilot.
    `

    console.log(`Sending approval email to ${app.profiles.email}...`)
    console.log(emailContent)

    // Log the email event in audit logs
    await supabase.from('audit_logs').insert({
      application_id,
      event_type: 'EMAIL_SENT',
      event_data: { type: 'APPROVAL', recipient: app.profiles.email }
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
