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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      email, 
      notifications_opt_in = true,
      energy_type,
      raw_data,
      ai_output,
      provider,
      price,
      kwh,
      m3,
      predicted_savings
    } = await req.json();

    console.log('Saving anonymous bill data for email:', email);

    // First, upsert the user
    const { error: userError } = await supabase
      .from('billsnap_users')
      .upsert(
        { email, notifications_opt_in, energy_type },
        { onConflict: 'email' }
      );

    if (userError) {
      console.error('Error upserting user:', userError);
      throw userError;
    }

    // Then insert the bill
    const { data: billData, error: billError } = await supabase
      .from('billsnap_bills')
      .insert({
        email,
        raw_data,
        ai_output,
        provider,
        price,
        kwh,
        m3,
        predicted_savings
      })
      .select()
      .single();

    if (billError) {
      console.error('Error inserting bill:', billError);
      throw billError;
    }

    console.log('Successfully saved bill:', billData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        bill_id: billData.id,
        message: 'Dati salvati con successo'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-anonymous-bill:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});