// Edge Function: test-log
// Simple test function to verify logging is working

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("TEST-OK - Function test-log invoked successfully");
  console.log("TEST-OK - Request method:", req.method);
  console.log("TEST-OK - Request URL:", req.url);
  console.log("TEST-OK - Timestamp:", new Date().toISOString());

  return new Response(
    JSON.stringify({
      ok: true,
      message: "TEST-OK",
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
