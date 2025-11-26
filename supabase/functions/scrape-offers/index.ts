// Edge Function: scrape-offers

const FIRECRAWL_API_KEY = "fc-14aee11fc0da4fae942e302597bde24e";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ ok: false, error: "Missing 'url' in body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("DEBUG Firecrawl – URL:", url);

    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
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

    const data = await res.json();

    console.log("DEBUG Firecrawl – status:", res.status);

    return new Response(
      JSON.stringify({
        ok: true,
        status: res.status,
        data,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("DEBUG Firecrawl – errore:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
