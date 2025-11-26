// Edge Function: scrape-offers
// Scrapes energy offers using Firecrawl API

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

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

  try {
    const { url } = await req.json();

    if (!url) {
      console.error("Missing URL parameter");
      return new Response(
        JSON.stringify({ ok: false, error: "Missing 'url' in body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!FIRECRAWL_API_KEY) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ ok: false, error: "Firecrawl API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("DEBUG Firecrawl – URL:", url);
    console.log("DEBUG Firecrawl – API Key configured:", !!FIRECRAWL_API_KEY);

    const firecrawlRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
      }),
    });

    const data = await firecrawlRes.json();

    console.log("DEBUG Firecrawl – status:", firecrawlRes.status);
    console.log("DEBUG Firecrawl – response:", JSON.stringify(data).substring(0, 200));

    return new Response(
      JSON.stringify({
        ok: true,
        status: firecrawlRes.status,
        data,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("DEBUG Firecrawl – error:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: String(err?.message || err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
