import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const WHATSAPP_API_KEY = Deno.env.get("WHATSAPP_API_KEY")
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID")

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // 1. Find inactive sessions that haven't received a recovery message yet
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data: sessions, error } = await supabase
      .from('onboarding_sessions')
      .select('*, loan_applications(user_id)')
      .lt('last_active_at', oneHourAgo)
      .is('recovery_sent_at', null)
      .limit(10)

    if (error) throw error

    const results = []

    for (const session of sessions) {
      const phoneNumber = session.phone_number
      if (!phoneNumber) continue

      // 2. Send WhatsApp Message
      const message = `Hi! We noticed you left your loan application at the ${session.current_step} stage. 
      Resume now to get your approval: https://loanpilot.vercel.app/onboarding?session=${session.id}`

      console.log(`Sending recovery to ${phoneNumber}: ${message}`)

      // In a real scenario, call WhatsApp API:
      try {
        const response = await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${WHATSAPP_API_KEY}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phoneNumber,
            type: "text",
            text: { body: message }
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error(`WhatsApp API error for ${phoneNumber}:`, errorData)
        }
      } catch (err) {
        console.error(`Failed to send WhatsApp message to ${phoneNumber}:`, err)
      }

      // 3. Mark as sent
      await supabase
        .from('onboarding_sessions')
        .update({ recovery_sent_at: new Date().toISOString() })
        .eq('id', session.id)

      results.push({ sessionId: session.id, status: 'SENT' })
    }

    return new Response(JSON.stringify({ processed: results.length, details: results }), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
