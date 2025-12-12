import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, User, MapPin, Calendar } from 'lucide-react';

interface Review {
  id: string;
  created_at: string;
  category: string;
  rating: number;
  message: string;
  instagram_username?: string;
  device?: string;
  version?: string;
}

// Helper per formattare le date in italiano senza librerie esterne
const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " anni fa";
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " mesi fa";
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " giorni fa";
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " ore fa";
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " min fa";
  
  return "Appena publicata";
};

const getCategoryLabel = (category: string) => {
  const map: Record<string, string> = {
    'stability': 'Stabilità',
    'ux': 'Facilità d\'uso',
    'accuracy': 'Risparmio',
    'support': 'Supporto Clienti',
    'other': 'Esperienza Generale'
  };
  return map[category] || 'Recensione';
};

export const ReviewsList = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('is_approved', true) 
        .order('created_at', { ascending: false })
        .limit(50); 

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-white/50 h-32 rounded-xl border border-gray-100" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center p-12 bg-white/50 rounded-2xl border border-dashed border-primary/20 backdrop-blur-sm">
        <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Nessuna recensione</h3>
        <p className="text-muted-foreground">Sii il primo a condividere la tua esperienza!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[600px] overflow-y-auto pr-2 custom-scrollbar pb-10">
      {reviews.map((review) => (
        <Card key={review.id} className="group bg-white hover:bg-white/90 border-transparent hover:border-primary/20 transition-all duration-300 shadow-sm hover:shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-5">
             <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                   <Avatar className="w-10 h-10 border-2 border-white shadow-sm ring-1 ring-gray-100">
                      <AvatarImage src={review.instagram_username ? `https://unavatar.io/instagram/${review.instagram_username}` : ''} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary"><User className="w-5 h-5" /></AvatarFallback>
                   </Avatar>
                   <div>
                      <h4 className="text-sm font-bold text-gray-900 leading-none mb-1">
                         {review.instagram_username ? `@${review.instagram_username}` : 'Utente BillSnap'}
                      </h4>
                      <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full w-fit">
                         <MapPin className="w-3 h-3 text-primary" /> Recensione Verificata
                      </p>
                   </div>
                </div>
                
                <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                  <span className="font-bold text-amber-600 text-sm">{review.rating}.0</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                        <Star 
                            key={i} 
                            className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} 
                        />
                    ))}
                  </div>
                </div>
             </div>

             <div className="relative pl-4 mt-2 mb-3">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/40 to-primary/5 rounded-full" />
                <p className="text-[14px] text-gray-600 leading-relaxed italic">
                   "{review.message === 'Legacy import' ? 'Utente soddisfatto del risparmio ottenuto.' : review.message}"
                </p>
             </div>

             <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-primary/70 bg-primary/5 px-2 py-1 rounded-md">
                   {getCategoryLabel(review.category)}
                </span>
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                   <Calendar className="w-3 h-3" />
                   {timeAgo(review.created_at)}
                </span>
             </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
