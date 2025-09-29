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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { 
      email, 
      category, 
      rating, 
      message, 
      device, 
      version, 
      timestamp, 
      user_agent 
    } = await req.json()

    // Validate required fields
    if (!category || !rating || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: category, rating, message' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get client IP for basic deduplication
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown'

    // Generate a basic hash for deduplication (IP + category + day)
    const today = new Date().toISOString().split('T')[0]
    const hashInput = `${clientIP}-${category}-${today}`
    const ipHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput))
      .then(buffer => Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      )

    // Check for duplicate feedback in the last 24 hours
    const { data: existingFeedback } = await supabaseClient
      .from('feedback')
      .select('id')
      .eq('ip_hash', ipHash)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1)

    if (existingFeedback && existingFeedback.length > 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Feedback already received today',
          feedback_id: existingFeedback[0].id 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Insert feedback
    const { data, error } = await supabaseClient
      .from('feedback')
      .insert({
        email: email || null,
        category,
        rating: parseInt(rating),
        message,
        device: device || null,
        version: version || '0.1.0',
        ip_hash: ipHash,
        user_agent: user_agent || null,
        created_at: timestamp || new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to save feedback' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        feedback_id: data.id,
        message: 'Feedback saved successfully'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})