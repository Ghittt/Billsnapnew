import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadPayload {
  upload_id: string;
  offer_id: string;
  provider: string;
  annual_saving_eur: number;
  current_annual_cost_eur: number;
  offer_annual_cost_eur: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  device?: string;
  redirect_url: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: LeadPayload = await req.json();
    console.log('Save lead payload received:', payload);

    // Validate required fields
    if (!payload.upload_id || !payload.provider || !payload.annual_saving_eur || !payload.redirect_url) {
      console.error('Missing required fields:', payload);
      return new Response(
        JSON.stringify({ error: 'Missing required fields: upload_id, provider, annual_saving_eur, redirect_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate IP hash for basic deduplication
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || '';
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const hashString = `${clientIP}-${userAgent}-${today}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(hashString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ip_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check for duplicate leads in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingLead, error: searchError } = await supabase
      .from('leads')
      .select('id, redirect_url')
      .eq('ip_hash', ip_hash)
      .eq('offer_id', payload.offer_id)
      .gte('cta_clicked_at', twentyFourHoursAgo)
      .maybeSingle();

    if (searchError) {
      console.error('Error checking for existing leads:', searchError);
    }

    if (existingLead) {
      console.log('Duplicate lead found, returning existing:', existingLead.id);
      return new Response(
        JSON.stringify({ 
          lead_id: existingLead.id, 
          redirect_url: existingLead.redirect_url,
          duplicate: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new lead record
    const leadData = {
      upload_id: payload.upload_id,
      offer_id: payload.offer_id,
      provider: payload.provider,
      annual_saving_eur: payload.annual_saving_eur,
      current_annual_cost_eur: payload.current_annual_cost_eur,
      offer_annual_cost_eur: payload.offer_annual_cost_eur,
      utm_source: payload.utm_source,
      utm_medium: payload.utm_medium,
      utm_campaign: payload.utm_campaign,
      device: payload.device || 'web',
      ip_hash: ip_hash,
      redirect_url: payload.redirect_url,
      status: 'clicked'
    };

    console.log('Inserting lead data:', leadData);

    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert(leadData)
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting lead:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save lead', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Lead saved successfully:', newLead.id);

    return new Response(
      JSON.stringify({ 
        lead_id: newLead.id, 
        redirect_url: payload.redirect_url,
        duplicate: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-lead function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});