import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DebugScraping = () => {
  const { toast } = useToast();
  const [scraping, setScraping] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);

  const fetchScrapedOffers = async () => {
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
    }
  };

  const runScraper = async () => {
    setScraping(true);

    try {
      toast({
        title: "Scraping avviato",
        description: "Sto scrappando le offerte... Potrebbe richiedere 1-2 minuti",
      });

      console.log("DEBUG FRONTEND – chiamo /functions/v1/scrape-offers");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-offers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            url: "https://www.enel.it",
          }),
        }
      );

      const data = await res.json();
      console.log("DEBUG FRONTEND – risposta:", res.status, data);

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Errore nello scraping");
      }

      toast({
        title: "Scraping completato",
        description: `Status Firecrawl: ${data.status}`,
      });

      await fetchScrapedOffers();
    } catch (error) {
      console.error("DEBUG FRONTEND – scraping error:", error);
      toast({
        title: "Errore scraping",
        description: "Qualcosa è andato storto durante lo scraping.",
        variant: "destructive",
      });
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Debug Scraping</h1>
        
        <div className="space-y-4">
          <Button onClick={runScraper} disabled={scraping}>
            {scraping ? "Scraping in corso..." : "Avvia Scraping Test"}
          </Button>

          <Button onClick={fetchScrapedOffers} variant="outline">
            Aggiorna Offerte
          </Button>

          {offers.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-2">
                Offerte trovate: {offers.length}
              </h2>
              <div className="space-y-2">
                {offers.map((offer) => (
                  <div key={offer.id} className="border p-3 rounded">
                    <p className="font-medium">{offer.provider} - {offer.plan_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Prezzo: {offer.price_kwh ? `${offer.price_kwh} €/kWh` : "N/D"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DebugScraping;
