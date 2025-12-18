import React, { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Globe, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Offer = {
  id: string;
  source: string | null;
  product_url: string | null;
  provider: string | null;
  created_at: string;
};

export default function DebugScraping() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const { toast } = useToast();

  // Legge le offerte dal DB Supabase
  const fetchScrapedOffers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .in("source", ["firecrawl", "scraper"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error("Error fetching scraped offers:", error);
      toast({
        title: "Errore caricamento dati",
        description: "Impossibile caricare le offerte dal DB.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScrapedOffers();
  }, []);

  // Avvia la edge function di scraping
  const runScraper = async () => {
    setScraping(true);
    try {
      toast({
        title: "Scraping avviato",
        description: "Chiamata a scrape-offers in corso...",
      });

      const { data, error } = await supabase.functions.invoke("scrape-offers", {
        body: {
          url: "https://www.enel.it",
        },
      });

      if (error) {
        console.error("Errore edge function:", error);
        throw new Error(error.message || "Errore nella chiamata");
      }

      console.log("Scraping result:", data);

      if (data?.ok) {
        toast({
          title: "Scraping completato",
          description: `Estratti ${data.scraped_length || 0} caratteri. Controlla i log in Cloud → Logs.`,
        });
      } else {
        toast({
          title: "Scraping fallito",
          description: data?.error || "Errore sconosciuto",
          variant: "destructive",
        });
      }

      // Ricarica i dati dal DB
      await fetchScrapedOffers();
    } catch (error: any) {
      console.error("Scraping error:", error);
      toast({
        title: "Errore scraping",
        description: error?.message || "Qualcosa è andato storto durante lo scraping.",
        variant: "destructive",
      });
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Globe className="h-8 w-8" />
              Debug Scraping
            </h1>
            <p className="text-muted-foreground">
              Visualizza dati Firecrawl salvati su Supabase e lancia uno scraping di test.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchScrapedOffers} disabled={loading || scraping}>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Ricarica dati
            </Button>

            <Button onClick={runScraper} disabled={loading || scraping}>
              <Play className="h-4 w-4 mr-2" />
              {scraping ? "Scraping..." : "Avvia scraping"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ultime offerte scrappate</CardTitle>
          </CardHeader>
          <CardContent>
            {offers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nessuna offerta trovata. Avvia lo scraping per popolare i dati.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offers.map((offer) => (
                <Card key={offer.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base truncate">{offer.provider || "Provider sconosciuto"}</CardTitle>
                      <Badge variant="outline">{offer.source || "sorgente"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground break-all">{offer.product_url}</p>
                    <p className="text-xs text-muted-foreground">{new Date(offer.created_at).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
