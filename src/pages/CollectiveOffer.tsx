import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Zap, CheckCircle2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CollectiveOffer() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-medium">In arrivo presto</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
            Offerta Collettiva BillSnap
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Stiamo costruendo la prima offerta di gruppo sull'energia. Più siamo, meno paghiamo.
          </p>

          <Badge variant="outline" className="text-base px-6 py-2">
            🚀 Fase 2 - Coming Soon
          </Badge>
        </div>

        {/* Feature Card */}
        <Card className="mb-8 border-primary/20 shadow-lg">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Come funzionerà</h2>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg mb-1">Unisciti al gruppo</p>
                  <p className="text-muted-foreground">
                    A 2.000 adesioni negoziamo l'offerta più bassa sul mercato
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg mb-1">Negoziazione diretta</p>
                  <p className="text-muted-foreground">
                    Trattiamo con i fornitori per ottenere condizioni esclusive
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg mb-1">Risparmio garantito</p>
                  <p className="text-muted-foreground">
                    Prezzi che non trovi sul mercato, zero vincoli
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 text-center text-lg">Vantaggi dell'offerta collettiva</h3>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium">Tariffa esclusiva</p>
                <p className="text-sm text-muted-foreground">Solo per il gruppo</p>
              </div>
              <div>
                <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium">Zero vincoli</p>
                <p className="text-sm text-muted-foreground">Libero di scegliere</p>
              </div>
              <div>
                <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium">Info chiare</p>
                <p className="text-sm text-muted-foreground">Trasparenza totale</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-8 text-center">
            <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Resta sintonizzato</h3>
            <p className="text-muted-foreground mb-6">
              L'Offerta Collettiva sarà disponibile nella Fase 2. Nel frattempo, continua a usare BillSnap per trovare le migliori offerte energia.
            </p>
            <Button size="lg" onClick={() => navigate('/')}>
              Torna alla Home
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
