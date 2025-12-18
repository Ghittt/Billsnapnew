/**
 * DEPRECATED: This function is disabled as part of architectural alignment.
 * 
 * REASON: AI should never generate copy with embedded numbers or calculations.
 * USE INSTEAD: bill-analyzer returns expert_copy that is already human-readable.
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

  console.warn('[DEPRECATED] ai-generate-copy called - returning 410 Gone');

  return new Response(JSON.stringify({
    error: "DEPRECATED: ai-generate-copy is disabled.",
    status: "DEPRECATED",
    deprecation_date: "2025-12-17",
    reason: "AI should never generate copy with embedded calculations. This violates the Single Source of Truth principle.",
    alternative: "The bill-analyzer function now returns expert_copy with pre-generated human-readable text.",
    http_status: 410
  }), {
    status: 410,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
