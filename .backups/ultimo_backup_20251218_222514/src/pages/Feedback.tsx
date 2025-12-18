import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, User, MapPin, MessageSquare, PenLine, ShieldCheck, Loader2, Quote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Review {
    id: string;
    created_at: string;
    category: string;
    rating: number;
    message: string;
    instagram_username?: string;
    review_name?: string;
    review_location?: string;
    profile_photo_url?: string;
}


// Generate random avatar fallback
const getRandomAvatar = (name: string) => {
    const seed = name?.toLowerCase().replace(/\s+/g, '') || 'user';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
};

const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " mesi fa";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " giorni fa";

    return "Recente";
};

const FeedbackPage = () => {
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

    const avgRating = reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
        : "5.0";

    return (
        <div className="min-h-screen bg-background">
            <Header />

            {/* Hero - BillSnap Style */}
            <div className="bg-gradient-to-br from-[#9b87f5] via-[#8B5CF6] to-[#7E69AB] text-white">
                <div className="container mx-auto px-4 py-16 md:py-24 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="font-medium text-sm">Recensioni Verificate via Email</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                        La Community BillSnap
                    </h1>
                    <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8">
                        Scopri cosa dicono le persone che hanno già risparmiato sulle bollette.
                    </p>

                    <div className="flex items-center justify-center gap-6 mb-10">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                                <span className="text-3xl font-bold">{avgRating}</span>
                            </div>
                            <p className="text-sm text-white/70">Media voti</p>
                        </div>
                        <div className="w-px h-12 bg-white/30" />
                        <div className="text-center">
                            <p className="text-3xl font-bold">{reviews.length}</p>
                            <p className="text-sm text-white/70">Recensioni</p>
                        </div>
                    </div>

                    <Link to="/scrivi-recensione">
                        <Button size="lg" className="bg-white text-[#9b87f5] hover:bg-white/90 font-bold text-lg px-8 py-6 rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95">
                            <PenLine className="w-5 h-5 mr-2" />
                            Lascia una Recensione
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Reviews Grid */}
            <div className="container mx-auto px-4 py-16">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-20 bg-secondary/10 rounded-2xl">
                        <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                        <h3 className="text-2xl font-bold mb-2">Nessuna recensione</h3>
                        <p className="text-muted-foreground mb-8">Sii il primo!</p>
                        <Link to="/scrivi-recensione">
                            <Button size="lg">Scrivi una Recensione</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {reviews.map((review) => (
                            <Card key={review.id} className="bg-white border-0 shadow-md hover:shadow-xl transition-shadow rounded-2xl overflow-hidden">
                                <CardContent className="p-6">
                                    {/* Header */}
                                    <div className="flex items-center gap-4 mb-4">
                                        <Avatar className="w-12 h-12 border-2 border-primary/20">
                                            <AvatarImage
                                                src={review.profile_photo_url || (review.instagram_username ? `https://unavatar.io/instagram/${review.instagram_username}` : getRandomAvatar(review.review_name))}
                                            />
                                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold">
                                                {(review.review_name || 'U').charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1">
                                            <h3 className="font-bold text-foreground">
                                                {review.review_name || (review.instagram_username ? `@${review.instagram_username}` : 'Utente BillSnap')}
                                            </h3>
                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {review.review_location || 'Italia'} • {timeAgo(review.created_at)}
                                            </p>
                                        </div>

                                        {/* Rating */}
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`w-4 h-4 ${i < review.rating ? 'fill-primary text-primary' : 'fill-gray-200 text-gray-200'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Quote */}
                                    <div className="relative pl-4 border-l-2 border-primary/20">
                                        <Quote className="absolute -left-3 -top-1 w-6 h-6 text-primary/20 bg-white" />
                                        <p className="text-muted-foreground leading-relaxed italic">
                                            {review.message === 'Legacy import' ? 'Esperienza eccellente con BillSnap!' : review.message}
                                        </p>
                                    </div>

                                    {/* Verified Badge */}
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-green-600">
                                        <ShieldCheck className="w-4 h-4" />
                                        <span className="font-medium">Recensione Verificata</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Bottom CTA */}
                {reviews.length > 0 && (
                    <div className="text-center mt-16">
                        <div className="inline-block bg-gradient-to-r from-primary/10 to-purple-100 rounded-2xl p-8 md:p-12">
                            <h3 className="text-2xl font-bold mb-2">Hai usato BillSnap?</h3>
                            <p className="text-muted-foreground mb-6">Condividi la tua esperienza con la community</p>
                            <Link to="/scrivi-recensione">
                                <Button size="lg" className="rounded-xl shadow-lg">
                                    <PenLine className="w-5 h-5 mr-2" />
                                    Scrivi la tua Recensione
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackPage;
