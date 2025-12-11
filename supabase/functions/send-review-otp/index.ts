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

    // Get client IP
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown'

    // Rate limiting: Check recent OTP requests from this email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recentCodes, error: checkError } = await supabaseClient
      .from('review_otp_codes')
      .select('id')
      .eq('email', email)
      .gte('created_at', oneHourAgo)

    if (checkError) {
      console.error('Error checking rate limit:', checkError)
    }

    if (recentCodes && recentCodes.length >= 3) {
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
        ip_address: clientIP
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting OTP:', insertError)
      throw new Error('Errore durante la generazione del codice')
    }

    // Send email via Resend (if API key is set)
    const resendApiKey = Deno.env.get('BILLSNAP_RESEND_KEY')
    
    if (resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'BillSnap <noreply@billsnap.it>',
            to: email,
            subject: 'Il tuo codice BillSnap',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #9b87f5;">💜 BillSnap</h2>
                <p style="font-size: 16px;">Grazie per la tua recensione!</p>
                <p style="font-size: 16px;">Il tuo codice di verifica è:</p>
                <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px;">
                  ${code}
                </div>
                <p style="color: #666; font-size: 14px;">Questo codice è valido per 10 minuti.</p>
                <p style="color: #666; font-size: 14px;">Se non hai richiesto questo codice, ignora questa email.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px; text-align: center;">BillSnap - Risparmia sulla bolletta</p>
              </div>
            `
          })
        })

        if (!emailResponse.ok) {
          const errorData = await emailResponse.text()
          console.error('Resend API error:', errorData)
          throw new Error('Errore invio email')
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError)
        // Don't fail the request, just log the error
        // In development, the code is still in the database
      }
    } else {
      console.log('BILLSNAP_RESEND_KEY not set. OTP code:', code, 'for email:', email)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Codice inviato a ${email}`,
        // In development, return the code for testing
        ...(resendApiKey ? {} : { code_for_testing: code })
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-review-otp:', error)
    return new Response(
      JSON.stringify({ error: 'Errore interno del server', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
