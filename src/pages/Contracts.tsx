import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, TrendingDown, Calendar, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Contract {
  id: string;
  provider: string;
  plan_name: string | null;
  commodity: string;
  start_date: string;
  end_date: string | null;
  annual_cost_eur: number | null;
  annual_kwh: number | null;
  annual_smc: number | null;
  is_current: boolean;
  notes: string | null;
  created_at: string;
}

export default function Contracts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare lo storico contratti",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const currentContract = contracts.find(c => c.is_current);
  const pastContracts = contracts.filter(c => !c.is_current);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-48 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">I tuoi contratti</h1>
          <p className="text-muted-foreground">
            Visualizza e gestisci lo storico dei tuoi contratti energetici
          </p>
        </div>

        {/* Current Contract */}
        {currentContract && (
          <Card className="border-primary/30 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Contratto Attuale
                </CardTitle>
                <Badge className="bg-success text-success-foreground">Attivo</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fornitore</p>
                  <p className="text-lg font-semibold">{currentContract.provider}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Piano</p>
                  <p className="text-lg font-semibold">{currentContract.plan_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <Badge variant="outline" className="capitalize">
                    {currentContract.commodity === 'power' ? 'Luce' : 'Gas'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Costo annuale</p>
                  <p className="text-lg font-semibold text-primary">
                    €{currentContract.annual_cost_eur?.toFixed(2) || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data inizio</p>
                  <p className="text-base">
                    {new Date(currentContract.start_date).toLocaleDateString('it-IT')}
                  </p>
                </div>
                {currentContract.end_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Data fine</p>
                    <p className="text-base">
                      {new Date(currentContract.end_date).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                )}
              </div>
              {currentContract.annual_kwh && (
                <div>
                  <p className="text-sm text-muted-foreground">Consumo annuale</p>
                  <p className="text-base">{currentContract.annual_kwh.toFixed(0)} kWh/anno</p>
                </div>
              )}
              {currentContract.annual_smc && (
                <div>
                  <p className="text-sm text-muted-foreground">Consumo annuale</p>
                  <p className="text-base">{currentContract.annual_smc.toFixed(0)} Smc/anno</p>
                </div>
              )}
              {currentContract.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Note</p>
                  <p className="text-base">{currentContract.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Past Contracts */}
        {pastContracts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Storico Contratti
            </h2>
            <div className="grid gap-4">
              {pastContracts.map(contract => (
                <Card key={contract.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Fornitore</p>
                        <p className="font-semibold">{contract.provider}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Piano</p>
                        <p className="font-semibold">{contract.plan_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Periodo</p>
                        <p className="text-sm">
                          {new Date(contract.start_date).toLocaleDateString('it-IT')} -{' '}
                          {contract.end_date 
                            ? new Date(contract.end_date).toLocaleDateString('it-IT')
                            : 'In corso'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Costo annuale</p>
                        <p className="font-semibold">
                          €{contract.annual_cost_eur?.toFixed(2) || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {contracts.length === 0 && (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Nessun contratto trovato</h3>
                <p className="text-muted-foreground">
                  I tuoi contratti verranno tracciati automaticamente dopo l'upload delle bollette
                </p>
              </div>
              <Button onClick={() => window.location.href = '/upload'}>
                Carica una bolletta
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
