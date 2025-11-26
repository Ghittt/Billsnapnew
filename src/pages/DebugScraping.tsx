const runScraper = async () => {
  setScraping(true);

  try {
    toast({
      title: "Scraping avviato",
      description: "Sto scrappando le offerte... Potrebbe richiedere 1-2 minuti",
    });

    console.log("DEBUG FRONTEND – chiamo /functions/scrape-offers");

    const res = await fetch("/functions/scrape-offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://www.enel.it",
      }),
    });

    const data = await res.json();
    console.log("DEBUG FRONTEND – risposta:", res.status, data);

    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Errore nello scraping");
    }

    toast({
      title: "Scraping completato",
      description: `Status Firecrawl: ${data.status}`,
    });

    // Ricerca i dati dal DB, se vuoi mantenerlo
    await fetchScrapedOffers();
  } catch (error) {
    console.error("DEBUG FRONTEND – scraping error:", error);
    toast({
      title: "Errore scraping",
      description: "Qualcosa è andato storto durante lo scraping.",
    });
  } finally {
    setScraping(false);
  }
};
