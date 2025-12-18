/**
 * DEPRECATED: This function is disabled as part of architectural alignment.
 * 
 * REASON: AI should never make offer selection decisions or perform calculations.
 * USE INSTEAD: bill-analyzer has deterministic comparison engine.
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

  console.warn('[DEPRECATED] ai-best-offer called - returning 410 Gone');

  return new Response(JSON.stringify({
    error: "DEPRECATED: ai-best-offer is disabled.",
    status: "DEPRECATED",
    deprecation_date: "2025-12-17",
    reason: "AI should never select offers or calculate costs. This violates the Single Source of Truth principle.",
    alternative: "The bill-analyzer function uses a deterministic comparison engine with versioned Decision Rules.",
    http_status: 410
  }), {
    status: 410,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
