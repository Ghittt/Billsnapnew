import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { platform, username } = await req.json()

    if (!platform || !username) {
      return new Response(
        JSON.stringify({ error: 'Missing platform or username' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate username (alphanumeric + underscore/dot only)
    const usernameRegex = /^[a-zA-Z0-9._]+$/
    if (!usernameRegex.test(username)) {
      return new Response(
        JSON.stringify({ error: 'Invalid username format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let photoUrl = null

    if (platform === 'instagram') {
      // Capture Instagram profile picture
      try {
        const response = await fetch(
          `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
          {
            headers: {
              'User-Agent': 'Instagram 76.0.0.15.395 Android',
              'X-IG-App-ID': '936619743392459'
            }
          }
        )

        if (!response.ok) {
          throw new Error('Instagram user not found')
        }

        const data = await response.json()
        photoUrl = data?.data?.user?.profile_pic_url_hd || data?.data?.user?.profile_pic_url

        if (!photoUrl) {
          throw new Error('Profile picture not found')
        }
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch Instagram profile picture', details: error.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (platform === 'facebook') {
      // Facebook requires App ID and Access Token
      // For now, return error - will implement when Facebook App is ready
      return new Response(
        JSON.stringify({ error: 'Facebook photo capture not yet implemented. Please use Instagram or upload manually.' }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid platform. Use "instagram" or "facebook"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        photo_url: photoUrl,
        platform,
        username 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in capture-social-photo:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
