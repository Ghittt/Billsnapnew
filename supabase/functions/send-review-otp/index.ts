import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate 6-digit OTP code
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { email } = await req.json()

    // Validate email
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Email non valida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting: Check recent OTP requests from this email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recentCodes, error: checkError } = await supabaseClient
      .from('review_otp_codes')
      .select('id')
      .eq('email', email)
      .gte('created_at', oneHourAgo)

    if (recentCodes && recentCodes.length >= 20) { // Increased limit for testing
      return new Response(
        JSON.stringify({ error: 'Troppi tentativi. Riprova tra un\'ora.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate OTP code
    const code = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store OTP in database
    const { data: otpData, error: insertError } = await supabaseClient
      .from('review_otp_codes')
      .insert({
        email: email.toLowerCase(),
        code,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting OTP:', insertError)
      throw new Error('Errore durante la generazione del codice')
    }

    // Send email via Resend (if API key is set)
    const resendApiKey = Deno.env.get('BILLSNAP_RESEND_KEY') || Deno.env.get('RESEND_KEY')
    
    if (resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'BillSnap <onboarding@resend.dev>',
            to: email,
            subject: 'Il tuo codice di verifica BillSnap',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #9b87f5; text-align: center;">💜 BillSnap</h2>
                <p style="font-size: 16px; text-align: center;">Grazie per il tuo feedback!</p>
                <p style="font-size: 16px; text-align: center;">Il tuo codice di verifica è:</p>
                <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px; color: #333;">
                  ${code}
                </div>
                <p style="color: #666; font-size: 14px; text-align: center;">Questo codice è valido per 10 minuti.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px; text-align: center;">BillSnap - Risparmia sulla bolletta</p>
              </div>
            `
          })
        })

        if (!emailResponse.ok) {
          const errorData = await emailResponse.text()
          console.error('Resend API error:', errorData)
          // Even if email fails, we might still want to allow the user to see the OTP in debug mode or similar,
          // but for now let's just log it and return error.
          throw new Error(`Errore invio email provider: ${errorData}`)
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError)
        return new Response(
          JSON.stringify({ error: 'Impossibile inviare email.', details: String(emailError) }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      console.warn('BILLSNAP_RESEND_KEY missing. Printing OTP to logs.');
      console.log(`[DEV] OTP for ${email}: ${code}`);
      // In dev environment or if key is missing, success allows debugging
       return new Response(
        JSON.stringify({ 
          success: true,
          message: `Codice generato (Dev Mode). Controlla i log.`,
          dev_otp: code // Only for debugging without email
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Codice inviato a ${email}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-review-otp:', error)
    return new Response(
      JSON.stringify({ error: 'Errore interno del server', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
