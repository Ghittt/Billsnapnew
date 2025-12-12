import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Star, User, Trash2, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ReviewDisplay {
  id: string;
  review_name: string;
  review_location: string;
  review_text: string;
  review_stars: number;
  profile_photo_url: string;
  email: string;
  email_verified: boolean;
  is_approved: boolean;
  show_in_carousel: boolean;
  created_at: string;
}

const AdminReviews = () => {
  const [reviews, setReviews] = useState<ReviewDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAdmin();
    fetchReviews();
  }, []);

  const checkAdmin = async () => {
      setIsAdmin(true); 
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .not('review_name', 'is', null) // Only fetch items that are reviews
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le recensioni",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleApproval = async (id: string, currentValue: boolean) => {
    try {
      // Toggle both approved and show_in_carousel
      const newValue = !currentValue;
      
      const { error } = await supabase
        .from('feedback')
        .update({ 
          is_approved: newValue,
          show_in_carousel: newValue 
        })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setReviews(reviews.map(r => 
        r.id === id ? { ...r, is_approved: newValue, show_in_carousel: newValue } : r
      ));

      toast({
        title: newValue ? "Visibile nel Carosello" : "nascosta dal Carosello",
        description: newValue ? "La recensione è ora pubblica in home page." : "La recensione non è più visibile.",
      });
    } catch (error) {
      console.error('Error updating review:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato",
        variant: "destructive"
      });
    }
  };

  const deleteReview = async (id: string) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setReviews(reviews.filter(r => r.id !== id));

      toast({
        title: "Recensione Eliminata",
        description: "Il feedback è stato rimosso definitivamente.",
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la recensione",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Gestione Recensioni</h1>
          <Badge variant="outline" className="px-4 py-2">
            Totale: {reviews.length}
          </Badge>
        </div>

        <div className="grid gap-6">
          {reviews.map((review) => (
            <Card key={review.id} className={`border-l-4 transition-all ${review.is_approved ? 'border-l-green-500 bg-green-50/10' : 'border-l-gray-300'}`}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                  
                  {/* User Info */}
                  <div className="flex items-start gap-4 min-w-[200px]">
                    <div className="relative">
                       <Avatar className="w-16 h-16 border-2 border-white shadow-sm">
                        <AvatarImage src={review.profile_photo_url} className="object-cover" />
                        <AvatarFallback><User className="w-8 h-8" /></AvatarFallback>
                      </Avatar>
                      {review.is_approved && (
                        <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1 rounded-full shadow-sm" title="Live in Homepage">
                          <Megaphone className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg">{review.review_name}</h3>
                      <p className="text-sm text-muted-foreground">{review.review_location}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {review.email_verified ? (
                          <Badge variant="secondary" className="text-[10px] text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0">
                            Unverified
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Review Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i < review.review_stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} 
                        />
                      ))}
                    </div>
                    <p className="text-foreground/90 italic text-lg leading-relaxed">"{review.review_text}"</p>
                    
                    <div className="flex gap-4 mt-2">
                         {review.email && (
                           <div className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                             {review.email}
                           </div>
                         )}
                         {/* Debug info */}
                         <div className="text-xs text-muted-foreground/50 font-mono px-2 py-1">
                            ID: {review.id.slice(0,8)}...
                         </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-4 min-w-[160px]">
                    <div className="flex items-center space-x-2 bg-secondary/10 p-2 rounded-lg border border-secondary/20">
                      <Switch 
                        id={`approve-${review.id}`}
                        checked={review.is_approved}
                        onCheckedChange={() => toggleApproval(review.id, review.is_approved)}
                      />
                      <label htmlFor={`approve-${review.id}`} className={`text-sm font-medium cursor-pointer ${review.is_approved ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {review.is_approved ? "In Homepage" : "Nascosta"}
                      </label>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="w-4 h-4 mr-1" />
                          Elimina
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Questa azione non può essere annullata. La recensione verrà eliminata definitivamente dal database.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteReview(review.id)} className="bg-red-500 hover:bg-red-600">
                            Elimina definitivamente
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                </div>
              </CardContent>
            </Card>
          ))}

          {reviews.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nessuna recensione trovata.
              <p className="text-sm mt-2">I feedback senza nome/testo non appaiono qui.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReviews;
