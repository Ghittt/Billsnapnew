import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Zap, Users, Target, Share2, CheckCircle2, Clock } from "lucide-react";

export default function CollectiveOffer() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [commodity, setCommodity] = useState<"energy" | "gas" | "dual">("dual");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    current_count: number;
    target: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    fetchStats();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('collective-stats-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'collective_stats'
        },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('collective-stats');
      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const headers: any = {
        'Content-Type': 'application/json',
      };
      
      if (session?.session?.access_token) {
        headers['Authorization'] = `Bearer ${session.session.access_token}`;
      }

      const { data, error } = await supabase.functions.invoke('collective-join', {
        body: { email, commodity, source: 'web' },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Attenzione",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "✅ Fatto!",
        description: "Ti avvisiamo quando l'offerta esclusiva è pronta.",
      });

      setEmail("");
      setStats(prev => prev ? {
        ...prev,
        current_count: data.current_count,
        percentage: Math.min(100, Math.round((data.current_count / data.target) * 100))
      } : null);

    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore. Riprova.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const shareText = "Unisciti all'Offerta Collettiva BillSnap! Più siamo, meno paghiamo. 💡";
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Offerta Collettiva BillSnap", text: shareText, url: shareUrl });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      toast({
        title: "Link copiato!",
        description: "Condividi con i tuoi amici",
      });
    }
  };

  const isNearGoal = stats && stats.current_count >= 1800 && stats.current_count < 2000;
  const isGoalReached = stats && stats.current_count >= 2000;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Offerta Collettiva</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
            Più siamo, meno paghiamo
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Arrivati a 2.000, trattiamo per un prezzo che non trovi sul mercato.
          </p>
        </div>

        {/* Stats Card */}
        <Card className="mb-8 border-primary/20 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-semibold text-lg">
                  {stats?.current_count || 0} / {stats?.target || 2000}
                </span>
              </div>
              {isGoalReached && (
                <Badge className="bg-green-500">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Obiettivo raggiunto
                </Badge>
              )}
              {isNearGoal && !isGoalReached && (
                <Badge className="bg-yellow-500">
                  <Zap className="w-3 h-3 mr-1" />
                  Quasi fatto
                </Badge>
              )}
            </div>
            
            <Progress value={stats?.percentage || 0} className="h-3 mb-2" />
            
            <p className="text-sm text-muted-foreground text-center">
              {stats?.percentage || 0}% dell'obiettivo raggiunto
            </p>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Come funziona
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">1</div>
                <div>
                  <p className="font-medium">Raccolta adesioni</p>
                  <p className="text-sm text-muted-foreground">Raggiungiamo 2.000 adesioni</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">2</div>
                <div>
                  <p className="font-medium">Negoziazione</p>
                  <p className="text-sm text-muted-foreground">Trattiamo con i fornitori</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">3</div>
                <div>
                  <p className="font-medium">Offerta pronta</p>
                  <p className="text-sm text-muted-foreground">Ti avvisiamo via email</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card className="mb-8">
          <CardContent className="p-6">
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
        <Card className="mb-8 border-primary/30 shadow-xl">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Unisciti al gruppo</h2>
            
            <form onSubmit={handleJoin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  placeholder="tuaemail@esempio.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  0 spam. Disiscrizione con un tap.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Interesse per</label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant={commodity === "energy" ? "default" : "outline"}
                    onClick={() => setCommodity("energy")}
                    className="w-full"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Luce
                  </Button>
                  <Button
                    type="button"
                    variant={commodity === "gas" ? "default" : "outline"}
                    onClick={() => setCommodity("gas")}
                    className="w-full"
                  >
                    Gas
                  </Button>
                  <Button
                    type="button"
                    variant={commodity === "dual" ? "default" : "outline"}
                    onClick={() => setCommodity("dual")}
                    className="w-full"
                  >
                    Entrambi
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Invio in corso..." : "Partecipa ora"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Share CTA */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6 text-center">
            <Share2 className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Invita un amico</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Arriviamo a 2.000 prima e partiamo con le trattative
            </p>
            <Button variant="outline" onClick={handleShare}>
              Condividi
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}