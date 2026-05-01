import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")

serve(async (req) => {
  try {
    const { transcript, applicationId, history } = await req.json()

    if (!transcript || !applicationId) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // 1. Prepare Gemini Prompt
    const systemPrompt = `
      You are a professional Loan Officer AI. You are interviewing a customer for a loan.
      
      BEHAVIORAL RULES:
      1. LANGUAGE: Detect the user's language (English or Hindi). Respond in the same language. If they speak Hindi, you must use Hindi.
      2. LIVENESS CHALLENGE: In your very first response after the user's initial consent, you MUST ask the user to perform a physical action for verification (e.g., "To verify your presence, please blink your eyes slowly or turn your head to the right.").
      3. PROPENSITY ANALYSIS: Analyze the user's tone, hesitation, and clarity. Internally track their "repayment_propensity" (High, Medium, Low).
      4. CONCISION: Keep responses concise.
      5. CONCLUSION: When you have enough info (income, purpose, employment, etc.), say "Thank you, I have all the information I need to process your application."

      CURRENT CONTEXT:
      - Interviewing for Application ID: ${applicationId}
    `

    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role === 'AI' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      { role: "user", parts: [{ text: transcript }] }
    ]

    // 2. Call Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents })
    })

    const result = await response.json()
    const aiReply = result.candidates?.[0]?.content?.parts?.[0]?.text || "I see. Could you tell me more about your employment?"

    // 3. Store Transcript
    await supabase.from('interview_transcripts').insert([
      { application_id: applicationId, speaker: 'USER', content: transcript },
      { application_id: applicationId, speaker: 'AI', content: aiReply }
    ])

    // 4. Check if interview is "complete"
    if (aiReply.toLowerCase().includes("all the information i need")) {
      await supabase.from('loan_applications').update({
        status: 'INTERVIEW_COMPLETE',
        interview_completed_at: new Date().toISOString()
      }).eq('id', applicationId)
    }

    return new Response(JSON.stringify({ reply: aiReply }), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
