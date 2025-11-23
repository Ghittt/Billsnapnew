import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2, X, AlertTriangle, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  recommendation_type: string;
  estimated_saving_eur: number | null;
  priority: number | null;
  expires_at: string | null;
  is_actioned: boolean;
  is_dismissed: boolean;
  created_at: string;
}

export default function AIRecommendations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

  const fetchRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_dismissed', false)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out expired recommendations
      const now = new Date();
      const validRecommendations = (data || []).filter(rec => 
        !rec.expires_at || new Date(rec.expires_at) > now
      );
      
      setRecommendations(validRecommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_recommendations')
        .update({ 
          is_actioned: true,
          actioned_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Azione completata",
        description: "La raccomandazione è stata contrassegnata come completata",
      });

      fetchRecommendations();
    } catch (error) {
      console.error('Error updating recommendation:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la raccomandazione",
        variant: "destructive"
      });
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_recommendations')
        .update({ 
          is_dismissed: true,
          dismissed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Raccomandazione ignorata",
        description: "Non verrà più mostrata",
      });

      fetchRecommendations();
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
      toast({
        title: "Errore",
        description: "Impossibile ignorare la raccomandazione",
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: number | null) => {
    if (!priority) return "default";
    if (priority >= 8) return "destructive";
    if (priority >= 5) return "secondary";
    return "default";
  };

  const getPriorityLabel = (priority: number | null) => {
    if (!priority) return "Normale";
    if (priority >= 8) return "Alta";
    if (priority >= 5) return "Media";
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

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Raccomandazioni AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nessuna raccomandazione al momento. Continua a usare BillSnap per ricevere consigli personalizzati!
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
          <Sparkles className="w-5 h-5 text-primary" />
          Raccomandazioni AI
          <Badge variant="secondary">{recommendations.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map(rec => (
          <Card key={rec.id} className="border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold">{rec.title}</h4>
                    <Badge variant={getPriorityColor(rec.priority)}>
                      {getPriorityLabel(rec.priority)}
                    </Badge>
                    {rec.estimated_saving_eur && rec.estimated_saving_eur > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <TrendingDown className="w-3 h-3" />
                        Risparmio: €{rec.estimated_saving_eur.toFixed(0)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                  {rec.expires_at && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertTriangle className="w-3 h-3" />
                      Scade il {new Date(rec.expires_at).toLocaleDateString('it-IT')}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(rec.id)}
                    className="gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Fatto
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss(rec.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
