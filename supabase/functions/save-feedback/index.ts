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
    // Use SERVICE_ROLE_KEY to bypass RLS policies for insertion
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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
      uploaded_photo_url,
      // Verification fields
      email_verified,
      verification_code_id
    } = body

    // Smart Photo Logic
    let finalPhotoUrl = profile_photo_url || uploaded_photo_url || null;

    if (!finalPhotoUrl) {
      if (instagram_username) {
        // Use Unavatar for Instagram (simple 0-step public profile fetch)
        const cleanUser = instagram_username.replace('@', '').trim();
        if (cleanUser) {
           finalPhotoUrl = `https://unavatar.io/instagram/${cleanUser}`;
        }
      } else if (email) {
        // Use Unavatar for Email (Gravatar/Clearbit fallback)
        finalPhotoUrl = `https://unavatar.io/${email}`;
      }
    }

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

    let finalVerificationId = verification_code_id || null;

    // Validate verification_code_id if provided
    if (verification_code_id) {
       const { data: codeCheck, error: codeError } = await supabaseClient
         .from('review_otp_codes')
         .select('id')
         .eq('id', verification_code_id)
         .maybeSingle()
      
       if (codeError || !codeCheck) {
         console.warn('Invalid verification_code_id provided:', verification_code_id)
         finalVerificationId = null; 
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
        profile_photo_url: finalPhotoUrl, // USING THE SMART PHOTO URL
        uploaded_photo_url: uploaded_photo_url || null,
        is_approved: false,
        show_in_carousel: false,
        email_verified: email_verified || false,
        verification_code_id: finalVerificationId
      })
      .select()
      .single()

    if (error) {
      console.error('Database error in save-feedback:', error)
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
      JSON.stringify({ 
        error: 'Errore durante il salvataggio', 
        details: error.message || 'Errore sconosciuto',
        originalError: JSON.stringify(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
