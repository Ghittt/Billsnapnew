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
      console.error("scrape-offers ERROR: Missing URL parameter");
      return new Response(
        JSON.stringify({ ok: false, error: "Missing 'url' in body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!FIRECRAWL_API_KEY) {
      console.error("scrape-offers ERROR: FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ ok: false, error: "Firecrawl API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("scrape-offers START: Calling Firecrawl for URL:", url);
    console.log("scrape-offers INFO: API Key configured:", !!FIRECRAWL_API_KEY);

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
    const responseText = data?.markdown || data?.html || "";
    const preview = responseText.substring(0, 300);

    console.log("scrape-offers RESPONSE: HTTP status:", firecrawlRes.status);
    console.log("scrape-offers RESPONSE: Scraped length:", responseText.length);
    console.log("scrape-offers RESPONSE: Preview (first 300 chars):", preview);

    return new Response(
      JSON.stringify({
        ok: true,
        scraped_length: responseText.length,
        preview: preview,
        status: firecrawlRes.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("scrape-offers ERROR: Exception caught:", err?.message || err);
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
