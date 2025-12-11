import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Star, Check, X, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Review {
  id: string;
  created_at: string;
  review_name: string;
  review_location: string | null;
  review_text: string;
  review_stars: number;
  instagram_username: string | null;
  profile_photo_url: string | null;
  is_approved: boolean;
  show_in_carousel: boolean;
}

const ReviewsAdmin = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .not('review_name', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: "Errore",
        description: "Non riesco a caricare le recensioni",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string, showInCarousel: boolean = true) => {
    setProcessingId(reviewId);
    try {
      const { error } = await supabase
        .from('feedback')
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
          show_in_carousel: showInCarousel
        })
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: "Recensione approvata!",
        description: showInCarousel ? "Apparirà nel carousel" : "Approvata ma non visibile",
      });

      fetchReviews();
    } catch (error) {
      console.error('Error approving review:', error);
      toast({
        title: "Errore",
        description: "Non riesco ad approvare la recensione",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reviewId: string) => {
    setProcessingId(reviewId);
    try {
      const { error } = await supabase
        .from('feedback')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: "Recensione eliminata",
        description: "La recensione è stata rimossa",
      });

      fetchReviews();
    } catch (error) {
      console.error('Error rejecting review:', error);
      toast({
        title: "Errore",
        description: "Non riesco a eliminare la recensione",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const toggleCarousel = async (reviewId: string, currentValue: boolean) => {
    setProcessingId(reviewId);
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ show_in_carousel: !currentValue })
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: !currentValue ? "Aggiunta al carousel" : "Rimossa dal carousel",
      });

      fetchReviews();
    } catch (error) {
      console.error('Error toggling carousel:', error);
      toast({
        title: "Errore",
        description: "Non riesco ad aggiornare la recensione",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getRandomLifestylePhoto = () => {
    const photos = ['motorcycle.png', 'sea.png', 'mountain.png', 'coffee.png', 'books.png', 'city.png', 'sunset.png'];
    return `/reviews/${photos[Math.floor(Math.random() * photos.length)]}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const pendingReviews = reviews.filter(r => !r.is_approved);
  const approvedReviews = reviews.filter(r => r.is_approved);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">Gestione Recensioni</h1>
              <p className="text-muted-foreground">
                {pendingReviews.length} in attesa • {approvedReviews.length} approvate
              </p>
            </div>
            <Button onClick={() => navigate('/recensioni')} variant="outline">
              Nuova Recensione
            </Button>
          </div>

          {/* Pending Reviews */}
          {pendingReviews.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">In Attesa di Approvazione</h2>
              {pendingReviews.map((review) => (
                <Card key={review.id} className="border-orange-500/30">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Avatar className="w-16 h-16 border-2 border-primary">
                        <AvatarImage 
                          src={review.profile_photo_url || getRandomLifestylePhoto()} 
                          className="object-cover"
                        />
                        <AvatarFallback>{review.review_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{review.review_name}</h3>
                            {review.review_location && (
                              <p className="text-sm text-muted-foreground">{review.review_location}</p>
                            )}
                            {review.instagram_username && (
                              <p className="text-xs text-muted-foreground">@{review.instagram_username}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-orange-500/10">Pending</Badge>
                        </div>
                        
                        <div className="flex gap-1">
                          {[...Array(review.review_stars)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                          ))}
                        </div>
                        
                        <p className="text-sm italic">"{review.review_text}"</p>
                        
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(review.id, true)}
                            disabled={processingId === review.id}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approva & Pubblica
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(review.id, false)}
                            disabled={processingId === review.id}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Approva (Nascosta)
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(review.id)}
                            disabled={processingId === review.id}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Elimina
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Approved Reviews */}
          {approvedReviews.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Recensioni Approvate</h2>
              {approvedReviews.map((review) => (
                <Card key={review.id} className="border-green-500/30">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Avatar className="w-16 h-16 border-2 border-primary">
                        <AvatarImage 
                          src={review.profile_photo_url || getRandomLifestylePhoto()} 
                          className="object-cover"
                        />
                        <AvatarFallback>{review.review_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{review.review_name}</h3>
                            {review.review_location && (
                              <p className="text-sm text-muted-foreground">{review.review_location}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="bg-green-500/10">Approvata</Badge>
                            {review.show_in_carousel && (
                              <Badge variant="outline" className="bg-blue-500/10">Visibile</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-1">
                          {[...Array(review.review_stars)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                          ))}
                        </div>
                        
                        <p className="text-sm italic">"{review.review_text}"</p>
                        
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleCarousel(review.id, review.show_in_carousel)}
                            disabled={processingId === review.id}
                          >
                            {review.show_in_carousel ? 'Nascondi' : 'Mostra'} nel Carousel
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(review.id)}
                            disabled={processingId === review.id}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Elimina
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {reviews.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Nessuna recensione ancora</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewsAdmin;
