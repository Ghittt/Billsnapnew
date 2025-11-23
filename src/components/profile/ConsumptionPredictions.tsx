import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Activity, Calendar } from "lucide-react";

interface Prediction {
  id: string;
  prediction_date: string;
  predicted_kwh: number | null;
  predicted_smc: number | null;
  confidence_score: number | null;
  factors: any;
  actual_kwh: number | null;
  actual_smc: number | null;
  created_at: string;
}

export default function ConsumptionPredictions() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPredictions();
    }
  }, [user]);

  const fetchPredictions = async () => {
    try {
      const { data, error } = await supabase
        .from('consumption_prediction')
        .select('*')
        .eq('user_id', user?.id)
        .order('prediction_date', { ascending: false })
        .limit(6);

      if (error) throw error;
      setPredictions(data || []);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score: number | null) => {
    if (!score) return "default";
    if (score >= 0.8) return "default";
    if (score >= 0.6) return "secondary";
    return "outline";
  };

  const getConfidenceLabel = (score: number | null) => {
    if (!score) return "N/A";
    if (score >= 0.8) return "Alta";
    if (score >= 0.6) return "Media";
    return "Bassa";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (predictions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Predizioni Consumo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Carica più bollette per ottenere predizioni sui consumi futuri basate sui tuoi pattern di utilizzo
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Predizioni Consumo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {predictions.map(prediction => (
            <Card key={prediction.id} className="border-primary/20">
              <CardContent className="p-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">
                        {new Date(prediction.prediction_date).toLocaleDateString('it-IT', {
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <Badge variant={getConfidenceColor(prediction.confidence_score)}>
                      Confidenza: {getConfidenceLabel(prediction.confidence_score)}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Predizione</p>
                    {prediction.predicted_kwh && (
                      <p className="text-lg font-semibold text-primary">
                        {prediction.predicted_kwh.toFixed(0)} kWh
                      </p>
                    )}
                    {prediction.predicted_smc && (
                      <p className="text-lg font-semibold text-primary">
                        {prediction.predicted_smc.toFixed(0)} Smc
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Consumo Reale</p>
                    {prediction.actual_kwh ? (
                      <p className="text-lg font-semibold">
                        {prediction.actual_kwh.toFixed(0)} kWh
                      </p>
                    ) : prediction.actual_smc ? (
                      <p className="text-lg font-semibold">
                        {prediction.actual_smc.toFixed(0)} Smc
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">In attesa dati</p>
                    )}
                  </div>
                </div>

                {prediction.factors && Object.keys(prediction.factors).length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Fattori considerati:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(prediction.factors).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {String(value)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
