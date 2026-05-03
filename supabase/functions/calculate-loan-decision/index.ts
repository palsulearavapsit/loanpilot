import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const { application_id } = await req.json()

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // 1. Fetch all application data & logs
    const { data: application } = await supabase
      .from('loan_applications')
      .select('*, profiles(*)')
      .eq('id', application_id)
      .single()

    const { data: logs } = await supabase
      .from('verification_logs')
      .select('*')
      .eq('application_id', application_id)

    const { data: transcripts } = await supabase
      .from('interview_transcripts')
      .select('*')
      .eq('application_id', application_id)

    // 2. Deterministic Scoring Algorithm
    // Weights: Credit (40%), Stability (30%), Authenticity (30%)
    
    // a. Credit Score (40%) - Simulated Bureau + Income/Amount Ratio
    const bureauScore = Math.floor(Math.random() * (850 - 600) + 600)
    const incomeRatio = (application.amount / (application.monthly_income * 12)) || 0.5
    let creditScore = (bureauScore / 850) * 40
    if (incomeRatio > 0.4) creditScore *= 0.8 // Penalty for high DTI

    // b. Stability (30%) - Employment Type + Income Consistency
    let stabilityScore = 0
    if (application.employment_type === 'SALARIED') stabilityScore = 30
    else if (application.employment_type === 'SELF_EMPLOYED') stabilityScore = 20
    else stabilityScore = 10

    // c. Authenticity (30%) - Liveness + Geolocation + Behavioral Signals
    let authenticityScore = 30
    const livenessFail = logs?.some(l => l.event_type === 'LIVENESS' && l.status === 'FAILED')
    if (livenessFail) authenticityScore -= 25
    
    // Check for VIDEO_KYC signals (Age, Stability)
    const videoKycLog = logs?.find(l => l.event_type === 'VIDEO_KYC')
    if (videoKycLog) {
      const { estimated_age, stability_score } = videoKycLog.payload || {}
      // If stability is low, reduce authenticity
      if (stability_score && stability_score < 0.8) authenticityScore -= 5
      // Age mismatch logic (Mock: if age > 50, flag as higher risk for this demo)
      if (estimated_age && estimated_age > 50) authenticityScore -= 5
    }

    const stressLogs = logs?.filter(l => l.event_type === 'EMOTION' && l.payload?.stress_level > 0.8)
    if (stressLogs && stressLogs.length > 5) authenticityScore -= 5

    const finalScore = Math.min(100, creditScore + stabilityScore + authenticityScore)

    // 3. Persona Classification
    let persona = 'Urban · Salaried'
    if (application.monthly_income < 30000) persona = 'Rural · Micro-Entrepreneur'
    else if (application.employment_type === 'SELF_EMPLOYED') persona = 'Urban · Self-Employed'

    // 4. Multi-Tenure Offer Generation
    const principal = application.amount || 100000
    const offers = [
      {
        type: 'Low Interest',
        tenure: 12,
        interest_rate: 10.5,
        emi: Math.round((principal * 1.105) / 12)
      },
      {
        type: 'Balanced',
        tenure: 24,
        interest_rate: 12.0,
        emi: Math.round((principal * 1.24) / 24)
      },
      {
        type: 'Flexible',
        tenure: 36,
        interest_rate: 13.5,
        emi: Math.round((principal * 1.40) / 36)
      }
    ]

    // 5. Final Decision
    const finalStatus = finalScore < 40 ? 'REJECTED' : 'APPROVED'

    await supabase
      .from('loan_applications')
      .update({
        status: finalStatus,
        risk_score: Math.round(100 - finalScore),
        decision_rationale: {
          bureau_score: bureauScore,
          persona,
          scoring_breakdown: { credit: creditScore, stability: stabilityScore, authenticity: authenticityScore },
          offers,
          final_score: Math.round(finalScore)
        }
      })
      .eq('id', application_id)

    return new Response(JSON.stringify({ 
      status: finalStatus, 
      score: Math.round(finalScore),
      persona,
      offers
    }), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
