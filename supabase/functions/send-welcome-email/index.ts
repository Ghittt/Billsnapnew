import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('BILLSNAP_RESEND_KEY')

serve(async (req) => {
  try {
    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'BILLSNAP_RESEND_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Invia email tramite Resend
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
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #A855F7;">Ciao e grazie per esserti iscritto al Gruppo di Acquisto BillSnap! 🎉</h2>
            
            <p>Insieme siamo più forti! Unendo le forze possiamo ottenere condizioni ancora più vantaggiose dai fornitori di energia.</p>
            
            <h3 style="color: #A855F7;">COME FUNZIONA:</h3>
            <p>Una volta raggiunto il numero minimo di partecipanti, il team di BillSnap negozierà direttamente con i principali fornitori di energia per ottenere tariffe esclusive riservate al nostro gruppo.</p>
            
            <h3 style="color: #A855F7;">COSA SUCCEDE ORA:</h3>
            <ul>
              <li>Riceverai aggiornamenti via email sul numero di partecipanti</li>
              <li>Ti contatteremo quando avremo raggiunto il numero necessario per avviare le trattative</li>
              <li>Potrai scegliere se aderire all'offerta negoziata (senza alcun obbligo)</li>
            </ul>
            
            <h3 style="color: #A855F7;">VANTAGGI:</h3>
            <ul>
              <li>✓ Tariffe esclusive non disponibili al pubblico</li>
              <li>✓ Potere contrattuale maggiore</li>
              <li>✓ Nessun costo di adesione</li>
              <li>✓ Nessun obbligo di sottoscrizione</li>
            </ul>
            
            <p>Hai domande? Rispondi a questa email o contattaci a <a href="mailto:support@billsnap.it">support@billsnap.it</a></p>
            
            <p><strong>Grazie per far parte del cambiamento!</strong></p>
            
            <p>Il Team BillSnap<br>
            <a href="https://www.billsnap.it">www.billsnap.it</a></p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">Questa è una email automatica. Per comunicazioni dirette scrivi a gruppoacquisto@billsnap.it</p>
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
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
