import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { email, code } = await req.json()

    // Validate input
    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email e codice richiesti' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: 'Codice non valido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find OTP code in database
    const { data: otpRecord, error: findError } = await supabaseClient
      .from('review_otp_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (findError) {
      console.error('Error finding OTP:', findError)
      throw new Error('Errore durante la verifica')
    }

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ error: 'Codice non valido o scaduto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already verified
    if (otpRecord.verified) {
      return new Response(
        JSON.stringify({ error: 'Codice già utilizzato' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(otpRecord.expires_at)
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ error: 'Codice scaduto. Richiedi un nuovo codice.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check attempts limit
    if (otpRecord.attempts >= 5) {
      return new Response(
        JSON.stringify({ error: 'Troppi tentativi. Richiedi un nuovo codice.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Increment attempts
    const { error: updateError } = await supabaseClient
      .from('review_otp_codes')
      .update({ 
        attempts: otpRecord.attempts + 1,
        verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', otpRecord.id)

    if (updateError) {
      console.error('Error updating OTP:', updateError)
      throw new Error('Errore durante la verifica')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        verified: true,
        verification_id: otpRecord.id,
        email: email.toLowerCase()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in verify-review-otp:', error)
    return new Response(
      JSON.stringify({ error: 'Errore interno del server', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
