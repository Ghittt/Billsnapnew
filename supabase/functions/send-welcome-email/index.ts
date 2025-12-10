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
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #A855F7 0%, #9333EA 100%); padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
                        <div style="margin-bottom: 20px;">
                          <span style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">BillSnap</span>
                        </div>
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Benvenuto nel Gruppo! 🎉</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        
                        <p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                          Ciao,<br><br>
                          Grazie per esserti iscritto al <strong style="color: #A855F7;">Gruppo di Acquisto BillSnap</strong>! 
                          Insieme siamo più forti e possiamo ottenere tariffe esclusive dai fornitori di energia.
                        </p>
                        
                        <!-- Section: Come Funziona -->
                        <div style="background-color: #f5f3ff; border-left: 4px solid #A855F7; padding: 20px; margin: 32px 0; border-radius: 4px;">
                          <h3 style="margin: 0 0 12px 0; color: #A855F7; font-size: 18px; font-weight: 600;">Come Funziona</h3>
                          <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                            Una volta raggiunto il numero minimo di partecipanti, negozieremo con i fornitori 
                            per ottenere tariffe esclusive riservate al nostro gruppo.
                          </p>
                        </div>
                        
                        <!-- Section: Cosa Succede Ora -->
                        <h3 style="margin: 32px 0 16px 0; color: #A855F7; font-size: 18px; font-weight: 600;">Cosa Succede Ora</h3>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 12px 0;">
                              <span style="color: #A855F7; font-size: 18px; margin-right: 8px;">✓</span>
                              <span style="color: #4b5563; font-size: 15px;">Riceverai aggiornamenti sul numero di partecipanti</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 0;">
                              <span style="color: #A855F7; font-size: 18px; margin-right: 8px;">✓</span>
                              <span style="color: #4b5563; font-size: 15px;">Ti contatteremo quando avremo il numero necessario</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 0;">
                              <span style="color: #A855F7; font-size: 18px; margin-right: 8px;">✓</span>
                              <span style="color: #4b5563; font-size: 15px;">Potrai scegliere se aderire (senza obbligo)</span>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Section: Vantaggi -->
                        <h3 style="margin: 32px 0 16px 0; color: #A855F7; font-size: 18px; font-weight: 600;">I Vantaggi</h3>
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #A855F7; font-weight: 600;">⚡</span>
                              <span style="color: #4b5563; font-size: 15px; margin-left: 8px;">Tariffe esclusive non disponibili al pubblico</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #A855F7; font-weight: 600;">💪</span>
                              <span style="color: #4b5563; font-size: 15px; margin-left: 8px;">Potere contrattuale maggiore</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #A855F7; font-weight: 600;">🎁</span>
                              <span style="color: #4b5563; font-size: 15px; margin-left: 8px;">Nessun costo di adesione</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #A855F7; font-weight: 600;">✨</span>
                              <span style="color: #4b5563; font-size: 15px; margin-left: 8px;">Nessun obbligo di sottoscrizione</span>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- CTA -->
                        <div style="text-align: center; margin: 40px 0 32px 0;">
                          <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">Hai domande? Siamo qui per aiutarti</p>
                          <a href="mailto:support@billsnap.it" style="display: inline-block; background: linear-gradient(135deg, #A855F7 0%, #9333EA 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                            Contattaci
                          </a>
                        </div>
                        
                        <!-- Footer Message -->
                        <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 32px;">
                          <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px; font-weight: 600;">
                            Grazie per far parte del cambiamento! 💜
                          </p>
                          <p style="margin: 0; color: #6b7280; font-size: 14px;">
                            Il Team BillSnap<br>
                            <a href="https://www.billsnap.it" style="color: #A855F7; text-decoration: none;">www.billsnap.it</a>
                          </p>
                        </div>
                        
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-radius: 0 0 16px 16px;">
                        <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                          Email automatica di conferma iscrizione<br>
                          Per comunicazioni dirette: <a href="mailto:gruppoacquisto@billsnap.it" style="color: #A855F7; text-decoration: none;">gruppoacquisto@billsnap.it</a>
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
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
