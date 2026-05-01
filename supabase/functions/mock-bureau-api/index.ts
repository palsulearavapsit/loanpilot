import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { pan_hash } = await req.json()

    // Simulate a bureau call (CIBIL/Experian)
    // In reality, this would call an external API
    const score = Math.floor(Math.random() * (850 - 650) + 650)
    
    const history = [
      { date: '2024-01-10', type: 'Credit Card', status: 'ON_TIME' },
      { date: '2023-11-05', type: 'Personal Loan', status: 'ON_TIME' },
      { date: '2023-08-20', type: 'Two Wheeler Loan', status: 'CLOSED' }
    ]

    return new Response(JSON.stringify({ 
      score, 
      status: 'SUCCESS',
      history,
      report_id: `REP-${Math.random().toString(36).substring(7).toUpperCase()}`
    }), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
