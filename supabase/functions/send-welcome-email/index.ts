import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('BILLSNAP_RESEND_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'BILLSNAP_RESEND_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'BillSnap Gruppo Acquisto <onboarding@resend.dev>',
        to: [email],
        reply_to: 'gruppoacquisto@billsnap.it',
        subject: '✅ Benvenuto nel Gruppo di Acquisto BillSnap!',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #A855F7; margin-bottom: 24px;">Ciao e grazie per esserti iscritto al Gruppo di Acquisto BillSnap! 🎉</h2>
            
            <p style="margin-bottom: 24px; line-height: 1.6;">Insieme siamo più forti! Unendo le forze possiamo ottenere condizioni ancora più vantaggiose dai fornitori di energia.</p>
            
            <h3 style="color: #A855F7; margin-top: 32px; margin-bottom: 16px;">COME FUNZIONA:</h3>
            <p style="margin-bottom: 24px; line-height: 1.6;">Una volta raggiunto il numero minimo di partecipanti, il team di BillSnap negozierà direttamente con i principali fornitori di energia per ottenere tariffe esclusive riservate al nostro gruppo.</p>
            
            <h3 style="color: #A855F7; margin-top: 32px; margin-bottom: 16px;">COSA SUCCEDE ORA:</h3>
            <ul style="margin-bottom: 24px; line-height: 1.8; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Riceverai aggiornamenti via email sul numero di partecipanti</li>
              <li style="margin-bottom: 8px;">Ti contatteremo quando avremo raggiunto il numero necessario per avviare le trattative</li>
              <li style="margin-bottom: 8px;">Potrai scegliere se aderire all'offerta negoziata (senza alcun obbligo)</li>
            </ul>
            
            <h3 style="color: #A855F7; margin-top: 32px; margin-bottom: 16px;">VANTAGGI:</h3>
            <ul style="margin-bottom: 32px; line-height: 1.8; padding-left: 20px;">
              <li style="margin-bottom: 8px;">✓ Tariffe esclusive non disponibili al pubblico</li>
              <li style="margin-bottom: 8px;">✓ Potere contrattuale maggiore</li>
              <li style="margin-bottom: 8px;">✓ Nessun costo di adesione</li>
              <li style="margin-bottom: 8px;">✓ Nessun obbligo di sottoscrizione</li>
            </ul>
            
            <p style="margin-top: 32px; margin-bottom: 8px; line-height: 1.6;">Hai domande? Rispondi a questa email o contattaci a <a href="mailto:support@billsnap.it" style="color: #A855F7;">support@billsnap.it</a></p>
            
            <p style="margin-top: 32px; margin-bottom: 8px;"><strong>Grazie per far parte del cambiamento!</strong></p>
            
            <p style="margin-top: 24px; margin-bottom: 32px;">
              Il Team BillSnap<br>
              <a href="https://www.billsnap.it" style="color: #A855F7;">www.billsnap.it</a>
            </p>
            
            <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666; margin: 0;">Questa è una email automatica. Per comunicazioni dirette scrivi a gruppoacquisto@billsnap.it</p>
          </div>
        `
      })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'Failed to send email')
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
