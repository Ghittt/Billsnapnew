/**
 * DEPRECATED: This function is disabled as part of architectural alignment.
 * 
 * REASON: AI should never perform normalization or calculations.
 * USE INSTEAD: bill-analyzer has deterministic Cost Engine.
 * 
 * Date deprecated: 2025-12-17
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.warn('[DEPRECATED] ai-normalize-calculate called - returning 410 Gone');

  return new Response(JSON.stringify({
    error: "DEPRECATED: ai-normalize-calculate is disabled.",
    status: "DEPRECATED",
    deprecation_date: "2025-12-17",
    reason: "AI should never normalize data or perform calculations. This violates the Single Source of Truth principle.",
    alternative: "The bill-analyzer function has a deterministic Cost Engine with guaranteed accuracy.",
    http_status: 410
  }), {
    status: 410,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
