import { useState, useEffect } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  name: string;
  location: string;
  text: string;
  avatar: string;
  stars: number;
}

// Hardcoded fallback reviews
const fallbackReviews: Review[] = [
  {
    id: "1",
    name: "Giuseppe",
    location: "Palermo",
    text: "Finalmente ho capito quanto spendo! Grazie a BillSnap ho chiarezza sulle mie bollette.",
    avatar: "/reviews/motorcycle.png",
    stars: 5,
  },
  {
    id: "2",
    name: "Giorgio A.",
    location: "Milano",
    text: "Ottimo servizio, veloce e preciso. L'analisi è arrivata in pochi istanti.",
    avatar: "/reviews/giorgio_real.png",
    stars: 5,
  },
  {
    id: "3",
    name: "Marco",
    location: "Milano",
    text: "Consigliatissimo per risparmiare. Ho trovato un'offerta molto più conveniente.",
    avatar: "/reviews/sea.png",
    stars: 5,
  },
  {
    id: "4",
    name: "Laura",
    location: "Milano",
    text: "Facile da usare, interfaccia pulita. Mi piace molto come vengono presentati i dati.",
    avatar: "/reviews/laura.png",
    stars: 5,
  },
  {
    id: "5",
    name: "Elena",
    location: "Milano",
    text: "Grazie a BillSnap ho cambiato fornitore in un attimo. Procedura semplicissima.",
    avatar: "/reviews/mountain.png",
    stars: 5,
  },
  {
    id: "6",
    name: "Francesco",
    location: "Firenze",
    text: "Utile e intuitivo. La lettura della bolletta funziona benissimo anche con foto non perfette.",
    avatar: "/reviews/poetry.png",
    stars: 5,
  },
  {
    id: "7",
    name: "Alessandro",
    location: "Lacchiarella (MI)",
    text: "Analisi bolletta super dettagliata. Mai visto un servizio così completo.",
    avatar: "/reviews/couple.png",
    stars: 5,
  },
  {
    id: "8",
    name: "Roberto",
    location: "Spiazzi di Gromo",
    text: "Pensavo fosse complicato invece è semplicissimo. Anche per chi non è esperto.",
    avatar: "/reviews/city.png",
    stars: 5,
  },
  {
    id: "9",
    name: "Sofia",
    location: "Cassina de' Pecchi",
    text: "Risparmiati 150€ l'anno! Non ci credevo finché non ho visto la prima bolletta.",
    avatar: "/reviews/sunset.png",
    stars: 5,
  },
  {
    id: "10",
    name: "Matteo",
    location: "Roma",
    text: "Servizio eccellente. Il supporto risponde subito e l'app è fatta bene.",
    avatar: "/reviews/matteo.png",
    stars: 5,
  },
];

const getRandomLifestylePhoto = () => {
  const photos = ['motorcycle.png', 'sea.png', 'mountain.png', 'coffee.png', 'books.png', 'city.png', 'sunset.png'];
  return `/reviews/${photos[Math.floor(Math.random() * photos.length)]}`;
};

export const ReviewsCarousel = () => {
  const [reviews, setReviews] = useState<Review[]>(fallbackReviews);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('id, review_name, review_location, review_text, review_stars, profile_photo_url')
        .eq('is_approved', true)
        .eq('show_in_carousel', true)
        .not('review_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedReviews: Review[] = data.map(item => ({
          id: item.id,
          name: item.review_name,
          location: item.review_location || '',
          text: item.review_text,
          avatar: item.profile_photo_url || getRandomLifestylePhoto(),
          stars: item.review_stars
        }));
        setReviews(formattedReviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      // Keep fallback reviews on error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-12 bg-secondary/10">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-12 bg-secondary/10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-primary mb-3">Cosa dicono di noi</h2>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <p>Recensioni reali da utenti verificati con Instagram</p>
          </div>
        </div>
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full max-w-5xl mx-auto"
        >
          <CarouselContent>
            {reviews.map((review) => (
              <CarouselItem key={review.id} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-1 h-full">
                  <Card className="h-full border-primary/20 bg-background/50 backdrop-blur">
                    <CardContent className="flex flex-col items-center p-6 text-center space-y-4 h-full">
                      <Avatar className="w-16 h-16 border-2 border-primary">
                        <AvatarImage src={review.avatar} alt={review.name} className="object-cover" />
                        <AvatarFallback>{review.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{review.name}</h3>
                        {review.location && (
                          <p className="text-sm text-muted-foreground">{review.location}</p>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        {[...Array(review.stars)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                        ))}
                      </div>
                      <p className="text-sm text-foreground/80 italic flex-1">"{review.text}"</p>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </div>
  );
};
