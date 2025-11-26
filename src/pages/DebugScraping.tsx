import React, { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Globe, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DebugScraping() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchScrapedOffers();
  }, []);

  const fetchScrapedOffers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("offers")
        .select("*")
        .in("source", ["firecrawl", "scraper"])
        .order("created_at", { ascending: false })
        .limit(20);

      setOffers(data || []);
    } catch (error) {
      console.error("Error fetching scraped offers:", error);
    } finally {
      setLoading(false);
    }
  };

  const runScraper = async () => {
    setScraping(true);
    try {
      toast({
        title: "Scraping avviato",
        description: "Sto scrapando le offerte... Potrebbe richiedere 1-2 minuti",
      });

      const { data, error } = await supabase.functions.invoke("scrape-offers", {
        body: {
          url: "https://www.enel.it",
        },
      });

      if (error) throw error;

      toast({
        title: "Scraping completato",
        description: `${data.scraped_count} offerte scrapate, ${data.inserted_count} inserite nel database`,
      });

      // Ricarica i dati
      await fetchScrapedOffers();
    } catch (error) {
      console.error("Scraping error:", error);
      toast({
        title: "Errore scraping",
        description: error instanceof Error ? error.message : "Errore durante lo scraping",
        variant: "destructive",
      });
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Globe className="h-8 w-8" />
              Debug Scraping
            </h1>
            <p className="text-muted-foreground">Visualizza dati Firecrawl salvati in Supabase</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchScrapedOffers} disabled={loading || scraping} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Ricarica
            </Button>
            <Button onClick={runScraper} disabled={loading || scraping}>
              <Play className={`h-4 w-4 mr-2 ${scraping ? "animate-pulse" : ""}`} />
              {scraping ? "Scraping..." : "Avvia Scraping"}
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{offers.length}</p>
                <p className="text-sm text-muted-foreground">Offerte totali</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{offers.filter((o) => o.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Offerte attive</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{offers.filter((o) => o.commodity === "power").length}</p>
                <p className="text-sm text-muted-foreground">Luce</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{offers.filter((o) => o.commodity === "gas").length}</p>
                <p className="text-sm text-muted-foreground">Gas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scraped Offers */}
        <Card>
          <CardHeader>
            <CardTitle>Offerte scrapate (ultimi 20)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {offers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nessuna offerta scrapata trovata. Clicca "Avvia Scraping" per iniziare.
              </p>
            ) : (
              offers.map((offer) => (
                <div key={offer.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-lg">{offer.provider}</p>
                      <p className="text-sm text-muted-foreground">{offer.plan_name}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={offer.is_active ? "default" : "secondary"}>
                        {offer.is_active ? "Attiva" : "Inattiva"}
                      </Badge>
                      <Badge variant="outline">{offer.commodity}</Badge>
                      {offer.source && <Badge variant="outline">{offer.source}</Badge>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Prezzo:</span>
                      <p className="font-semibold">
                        {offer.commodity === "power"
                          ? `${offer.price_kwh?.toFixed(3)} €/kWh`
                          : `${offer.unit_price_eur_smc?.toFixed(3)} €/Smc`}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quota fissa:</span>
                      <p className="font-semibold">{offer.fixed_fee_eur_mo?.toFixed(2)} €/mese</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <p className="font-semibold">{offer.pricing_type}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Scrapato il:</span>
                      <p className="font-semibold text-xs">{new Date(offer.created_at).toLocaleDateString("it-IT")}</p>
                    </div>
                  </div>

                  {offer.redirect_url && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">URL:</span>
                      <a
                        href={offer.redirect_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-primary hover:underline break-all"
                      >
                        {offer.redirect_url}
                      </a>
                    </div>
                  )}

                  {offer.url_ok !== null && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant={offer.url_ok ? "default" : "destructive"}>
                        URL {offer.url_ok ? "OK" : "Error"}
                      </Badge>
                      {offer.url_status && <span className="text-muted-foreground">Status: {offer.url_status}</span>}
                      {offer.url_error && <span className="text-destructive text-xs">{offer.url_error}</span>}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
