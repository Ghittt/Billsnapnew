import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Star, Instagram, Upload, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const SubmitReview = () => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [stars, setStars] = useState(5);
  const [photoOption, setPhotoOption] = useState<'none' | 'instagram' | 'upload'>('none');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const captureInstagramPhoto = async () => {
    if (!instagramUsername.trim()) {
      toast({
        title: "Username mancante",
        description: "Inserisci il tuo username Instagram",
        variant: "destructive"
      });
      return;
    }

    setIsCapturingPhoto(true);
    try {
      const { data, error } = await supabase.functions.invoke('capture-social-photo', {
        body: { platform: 'instagram', username: instagramUsername.trim() }
      });

      if (error) throw error;

      if (data?.photo_url) {
        setProfilePhotoUrl(data.photo_url);
        toast({
          title: "Foto caricata!",
          description: "La tua foto profilo Instagram è stata caricata con successo",
        });
      }
    } catch (error) {
      console.error('Error capturing Instagram photo:', error);
      toast({
        title: "Errore",
        description: "Non riesco a trovare questo profilo Instagram. Controlla lo username.",
        variant: "destructive"
      });
    } finally {
      setIsCapturingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !reviewText.trim()) {
      toast({
        title: "Campi mancanti",
        description: "Inserisci almeno il tuo nome e la recensione",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('save-feedback', {
        body: {
          review_name: name.trim(),
          review_location: location.trim() || null,
          review_text: reviewText.trim(),
          review_stars: stars,
          instagram_username: photoOption === 'instagram' ? instagramUsername.trim() : null,
          profile_photo_url: profilePhotoUrl || null,
          timestamp: new Date().toISOString(),
        }
      });

      if (error) throw error;

      toast({
        title: "Recensione inviata!",
        description: "Grazie! La tua recensione sarà pubblicata dopo l'approvazione.",
      });

      // Reset form
      setName('');
      setLocation('');
      setReviewText('');
      setStars(5);
      setPhotoOption('none');
      setInstagramUsername('');
      setProfilePhotoUrl('');
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Errore",
        description: "Non riesco a inviare la recensione. Riprova tra poco.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-primary">Lascia una Recensione</h1>
            <p className="text-muted-foreground">
              Condividi la tua esperienza con BillSnap
            </p>
          </div>

          {/* Form */}
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nome e Località */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome *</label>
                    <Input
                      placeholder="Il tuo nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Città (opzionale)</label>
                    <Input
                      placeholder="Milano"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>

                {/* Stelle */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valutazione</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setStars(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= stars
                              ? 'fill-primary text-primary'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recensione */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">La tua recensione *</label>
                  <Textarea
                    placeholder="Racconta la tua esperienza con BillSnap..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                {/* Foto Profilo */}
                <div className="space-y-4">
                  <label className="text-sm font-medium">Foto profilo (opzionale)</label>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant={photoOption === 'none' ? 'default' : 'outline'}
                      onClick={() => {
                        setPhotoOption('none');
                        setProfilePhotoUrl('');
                      }}
                      className="flex-1 min-w-[140px]"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Foto Random
                    </Button>
                    <Button
                      type="button"
                      variant={photoOption === 'instagram' ? 'default' : 'outline'}
                      onClick={() => setPhotoOption('instagram')}
                      className="flex-1 min-w-[140px]"
                    >
                      <Instagram className="w-4 h-4 mr-2" />
                      Instagram
                    </Button>
                  </div>

                  {/* Instagram Username Input */}
                  {photoOption === 'instagram' && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="@username"
                        value={instagramUsername}
                        onChange={(e) => setInstagramUsername(e.target.value.replace('@', ''))}
                      />
                      <Button
                        type="button"
                        onClick={captureInstagramPhoto}
                        disabled={isCapturingPhoto}
                      >
                        {isCapturingPhoto ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Carica'
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Preview */}
                  {profilePhotoUrl && (
                    <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                      <Avatar className="w-12 h-12 border-2 border-primary">
                        <AvatarImage src={profilePhotoUrl} />
                        <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{name}</p>
                        <p className="text-xs text-muted-foreground">Foto profilo caricata</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Invio in corso...
                    </>
                  ) : (
                    'Pubblica Recensione'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SubmitReview;
