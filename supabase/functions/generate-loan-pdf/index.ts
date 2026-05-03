import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const { application_id } = await req.json()

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: application } = await supabase
      .from('loan_applications')
      .select('*, profiles(*)')
      .eq('id', application_id)
      .single()

    if (!application) throw new Error("Application not found")

    // Mock PDF Generation logic
    // In a real system, we would use a library like 'jspdf' or 'pdf-lib' 
    // or a specialized PDF generation service.
    const certificateData = {
      certificate_id: `LP-${Math.random().toString(36).substring(7).toUpperCase()}`,
      issued_to: application.profiles.full_name,
      amount: application.amount,
      status: application.status,
      risk_score: application.risk_score,
      issued_at: new Date().toISOString(),
      digital_signature: "AGENTIC_AI_VERIFIED_SIGNATURE_0x8372"
    }

    // We store this certificate in the audit vault
    const fileName = `approval-cert-${application_id}.json`
    await supabase.storage
      .from('audit-vault')
      .upload(`${application_id}/${fileName}`, JSON.stringify(certificateData), {
        contentType: 'application/json',
        upsert: true
      })

    return new Response(JSON.stringify(certificateData), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
