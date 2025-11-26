// FIRECRAWL DEBUG FUNCTION — backend only

const FIRECRAWL_API_KEY = "INSERISCI_LA_TUA_API_KEY";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    console.log("DEBUG Firecrawl – URL ricevuto:", url);

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

    console.log("DEBUG Firecrawl – status:", res.status);

    const data = await res.json();

    console.log("DEBUG Firecrawl – primi 500 caratteri:", JSON.stringify(data).slice(0, 500));

    return new Response(
      JSON.stringify({
        ok: true,
        firecrawlRaw: data,
      }),
      { status: 200 },
    );
  } catch (err: any) {
    console.error("DEBUG Firecrawl – errore:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: String(err?.message || err),
      }),
      { status: 500 },
    );
  }
}
