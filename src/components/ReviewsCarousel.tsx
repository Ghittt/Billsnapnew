import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, ShieldCheck } from "lucide-react";

interface Review {
  id: number;
  name: string;
  location: string;
  text: string;
  avatar: string;
  stars: number;
}

const reviews: Review[] = [
  {
    id: 1,
    name: "Giuseppe",
    location: "Palermo",
    text: "Finalmente ho capito quanto spendo! Grazie a BillSnap ho chiarezza sulle mie bollette.",
    avatar: "/reviews/giuseppe.png",
    stars: 5,
  },
  {
    id: 2,
    name: "Giorgio A.",
    location: "Milano",
    text: "Ottimo servizio, veloce e preciso. L'analisi è arrivata in pochi istanti.",
    avatar: "/reviews/giorgio.png",
    stars: 5,
  },
  {
    id: 3,
    name: "Marco",
    location: "Milano",
    text: "Consigliatissimo per risparmiare. Ho trovato un'offerta molto più conveniente.",
    avatar: "/reviews/marco.png",
    stars: 5,
  },
  {
    id: 4,
    name: "Laura",
    location: "Milano",
    text: "Facile da usare, interfaccia pulita. Mi piace molto come vengono presentati i dati.",
    avatar: "/reviews/laura.png",
    stars: 5,
  },
  {
    id: 5,
    name: "Elena",
    location: "Milano",
    text: "Grazie a BillSnap ho cambiato fornitore in un attimo. Procedura semplicissima.",
    avatar: "/reviews/elena.png",
    stars: 5,
  },
  {
    id: 6,
    name: "Francesco",
    location: "Firenze",
    text: "Utile e intuitivo. L'OCR funziona benissimo anche con foto non perfette.",
    avatar: "/reviews/francesco.png",
    stars: 5,
  },
  {
    id: 7,
    name: "Alessandro",
    location: "Lacchiarella (MI)",
    text: "Analisi bolletta super dettagliata. Mai visto un servizio così completo.",
    avatar: "/reviews/alessandro.png",
    stars: 5,
  },
  {
    id: 8,
    name: "Roberto",
    location: "Spiazzi di Gromo",
    text: "Pensavo fosse complicato invece è semplicissimo. Anche per chi non è esperto.",
    avatar: "/reviews/roberto.png",
    stars: 5,
  },
  {
    id: 9,
    name: "Sofia",
    location: "Cassina de' Pecchi",
    text: "Risparmiati 150€ l'anno! Non ci credevo finché non ho visto la prima bolletta.",
    avatar: "/reviews/sofia.png",
    stars: 5,
  },
  {
    id: 10,
    name: "Matteo",
    location: "Roma",
    text: "Servizio eccellente. Il supporto risponde subito e l'app è fatta bene.",
    avatar: "/reviews/matteo.png",
    stars: 5,
  },
];

export const ReviewsCarousel = () => {
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
                <div className="p-1">
                  <Card className="h-full border-primary/20 bg-background/50 backdrop-blur">
                    <CardContent className="flex flex-col items-center p-6 text-center space-y-4 h-full">
                      <Avatar className="w-16 h-16 border-2 border-primary">
                        <AvatarImage src={review.avatar} alt={review.name} className="object-cover" />
                        <AvatarFallback>{review.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{review.name}</h3>
                        <p className="text-sm text-muted-foreground">{review.location}</p>
                      </div>
                      <div className="flex space-x-1">
                        {[...Array(review.stars)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                        ))}
                      </div>
                      <p className="text-sm text-foreground/80 italic">"{review.text}"</p>
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
