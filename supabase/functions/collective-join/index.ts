import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, commodity, source } = await req.json();

    // Validate inputs
    if (!email || !commodity) {
      return new Response(
        JSON.stringify({ error: 'Email and commodity are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate commodity
    if (!['energy', 'gas', 'dual'].includes(commodity)) {
      return new Response(
        JSON.stringify({ error: 'Invalid commodity. Must be energy, gas, or dual' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user_id if authenticated
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id;
    }

    // Insert signup
    const { data: signup, error: insertError } = await supabaseClient
      .from('collective_signups')
      .insert({
        user_id: userId,
        email: email.toLowerCase().trim(),
        commodity,
        source: source || 'web'
      })
      .select()
      .single();

    if (insertError) {
      // Check if it's a duplicate
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Hai già aderito con questa email per questa categoria' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw insertError;
    }

    // Get updated stats
    const { data: stats } = await supabaseClient
      .from('collective_stats')
      .select('*')
      .eq('id', 1)
      .single();

    console.log('New collective signup:', { email, commodity, current_count: stats?.current_count });

    return new Response(
      JSON.stringify({
        ok: true,
        current_count: stats?.current_count || 0,
        target: stats?.target || 2000,
        signup_id: signup.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in collective-join:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});