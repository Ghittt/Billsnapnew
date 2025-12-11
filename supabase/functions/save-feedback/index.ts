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

    const body = await req.json()
    
    const { 
      // Old feedback fields
      email, 
      category, 
      rating, 
      message, 
      device, 
      version, 
      timestamp, 
      user_agent,
      // New review fields
      review_name,
      review_location,
      review_text,
      review_stars,
      instagram_username,
      facebook_username,
      profile_photo_url,
      uploaded_photo_url
    } = body

    // Determine if this is a review or feedback
    const isReview = review_name && review_text && review_stars

    // Validate required fields
    if (isReview) {
      if (!review_name || !review_text || !review_stars) {
        return new Response(
          JSON.stringify({ error: 'Missing required review fields: name, text, stars' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } else {
      if (!category || !rating || !message) {
        return new Response(
          JSON.stringify({ error: 'Missing required feedback fields: category, rating, message' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Get client IP for basic deduplication
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown'

    // Generate a basic hash for deduplication
    const today = new Date().toISOString().split('T')[0]
    const hashInput = `${clientIP}-${isReview ? 'review' : category}-${today}`
    const ipHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput))
      .then(buffer => Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      )

    // Insert feedback/review
    const { data, error } = await supabaseClient
      .from('feedback')
      .insert({
        // Common fields
        created_at: timestamp || new Date().toISOString(),
        ip_hash: ipHash,
        user_agent: user_agent || null,
        // Old feedback fields
        email: email || null,
        category: category || null,
        rating: rating ? parseInt(rating) : null,
        message: message || null,
        device: device || null,
        version: version || '0.1.0',
        // New review fields
        review_name: review_name || null,
        review_location: review_location || null,
        review_text: review_text || null,
        review_stars: review_stars || null,
        instagram_username: instagram_username || null,
        facebook_username: facebook_username || null,
        profile_photo_url: profile_photo_url || null,
        uploaded_photo_url: uploaded_photo_url || null,
        is_approved: false,
        show_in_carousel: false
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: isReview ? 'Review submitted successfully' : 'Feedback submitted successfully',
        data 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in save-feedback:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
