import { useState } from "react";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Zap, CheckCircle2, Sparkles, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function CollectiveOffer() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [commodity, setCommodity] = useState<'energy' | 'gas' | 'dual'>('energy');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [stats, setStats] = useState({ current: 847, target: 2000 });

  const handleJoinCollective = async () => {
    if (!email || !email.includes("@")) {
      toast({
        title: "Email non valida",
        description: "Inserisci un indirizzo email valido",
        variant: "destructive"
      });
      return;
    }

    if (!acceptTerms) {
      toast({
        title: "Accetta i termini",
        description: "Devi accettare i termini per partecipare",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("group_buying_subscribers")
        .insert([{
          email,
          interested_in: commodity === "energy" ? "luce" : commodity === "gas" ? "gas" : "dual",
          utm_source: "collective_page"
        }]);

      if (error) throw error;


      // Invia email di benvenuto
      const emailResult = await supabase.functions.invoke("send-welcome-email", {
        body: { email }
      });
      
      if (emailResult.error) {
        console.error("❌ Email error:", emailResult.error);
        alert("Email non inviata: " + JSON.stringify(emailResult.error));
      } else {
        console.log("✅ Email sent successfully:", emailResult.data);
      }



      setHasJoined(true);
      toast({
        title: "Benvenuto nel gruppo!",
        description: "Ti avviseremo quando raggiungeremo il target e attiveremo l'offerta esclusiva."
      });

      setStats(prev => ({ ...prev, current: prev.current + 1 }));
    } catch (error: any) {
      console.error("Error joining collective:", error);
      toast({
        title: "Errore",
        description: error.message.includes("duplicate") 
          ? "Questa email è già registrata!" 
          : "Impossibile completare l'iscrizione. Riprova.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = Math.min((stats.current / stats.target) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-medium">Offerta Attiva</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
            Offerta Collettiva BillSnap
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            La prima offerta di gruppo sull'energia è qui. Più siamo, meno paghiamo tutti.
          </p>

          <Badge variant="default" className="text-base px-6 py-2">
            ⚡ {stats.current} / {stats.target} partecipanti
          </Badge>

          {/* Progress Bar */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {progressPercentage.toFixed(0)}% completato
            </p>
          </div>
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

        {/* Join Form */}
        {!hasJoined ? (
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Unisciti al gruppo acquisto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="tua@email.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo energia</label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={commodity === 'energy' ? 'default' : 'outline'}
                    onClick={() => setCommodity('energy')}
                    disabled={isSubmitting}
                  >
                    ⚡ Luce
                  </Button>
                  <Button
                    variant={commodity === 'gas' ? 'default' : 'outline'}
                    onClick={() => setCommodity('gas')}
                    disabled={isSubmitting}
                  >
                    🔥 Gas
                  </Button>
                  <Button
                    variant={commodity === 'dual' ? 'default' : 'outline'}
                    onClick={() => setCommodity('dual')}
                    disabled={isSubmitting}
                  >
                    ⚡🔥 Entrambi
                  </Button>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Accetto di ricevere aggiornamenti sull'offerta collettiva e di partecipare al gruppo acquisto
                </label>
              </div>

              <Button 
                onClick={handleJoinCollective} 
                disabled={isSubmitting || !email || !acceptTerms}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? 'Iscrizione...' : 'Partecipa al gruppo'}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Zero costi. Nessun vincolo. Ti avvisiamo solo quando l'offerta sarà pronta.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Sei nel gruppo!</h3>
              <p className="text-muted-foreground mb-6">
                Ti terremo aggiornato via email sul progresso del gruppo acquisto e ti avviseremo quando l'offerta esclusiva sarà pronta.
              </p>
              <Button size="lg" onClick={() => navigate('/')}>
                Torna alla Home
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
