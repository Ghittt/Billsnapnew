import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Star, Instagram, Sparkles, Loader2, Mail, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OTPInput } from '@/components/OTPInput';

const SubmitReview = () => {
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [stars, setStars] = useState(5);
  const [photoOption, setPhotoOption] = useState<'none' | 'instagram'>('none');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  
  // Flow state
  const [step, setStep] = useState<'review' | 'otp'>('review');
  const [otpCode, setOtpCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  
  // Loading states
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Resend timer
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  
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

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !reviewText.trim()) {
      toast({
        title: "Campi mancanti",
        description: "Inserisci nome, email e recensione",
        variant: "destructive"
      });
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Email non valida",
        description: "Inserisci un indirizzo email valido",
        variant: "destructive"
      });
      return;
    }

    setIsSendingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-review-otp', {
        body: { email: email.trim().toLowerCase() }
      });

      if (error) throw error;

      toast({
        title: "Codice inviato!",
        description: `Controlla la tua email: ${email}`,
      });

      // Start resend timer
      setCanResend(false);
      setResendTimer(60);
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setStep('otp');
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Errore",
        description: "Non riesco a inviare il codice. Riprova tra poco.",
        variant: "destructive"
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpComplete = async (code: string) => {
    setOtpCode(code);
    setIsVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-review-otp', {
        body: { email: email.trim().toLowerCase(), code }
      });

      if (error) throw error;

      if (data?.verified) {
        setVerificationId(data.verification_id);
        // Proceed to save review
        await saveReview(data.verification_id);
      } else {
        throw new Error('Verifica fallita');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "Codice non valido",
        description: "Controlla il codice e riprova",
        variant: "destructive"
      });
      setOtpCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const saveReview = async (verificationCodeId: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('save-feedback', {
        body: {
          email: email.trim().toLowerCase(),
          review_name: name.trim(),
          review_location: location.trim() || null,
          review_text: reviewText.trim(),
          review_stars: stars,
          instagram_username: photoOption === 'instagram' ? instagramUsername.trim() : null,
          profile_photo_url: profilePhotoUrl || null,
          email_verified: true,
          verification_code_id: verificationCodeId,
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
      setEmail('');
      setLocation('');
      setReviewText('');
      setStars(5);
      setPhotoOption('none');
      setInstagramUsername('');
      setProfilePhotoUrl('');
      setStep('review');
      setOtpCode('');
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Errore",
        description: "Non riesco a salvare la recensione. Riprova tra poco.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    
    setIsSendingOtp(true);
    try {
      const { error } = await supabase.functions.invoke('send-review-otp', {
        body: { email: email.trim().toLowerCase() }
      });

      if (error) throw error;

      toast({
        title: "Codice inviato!",
        description: "Controlla la tua email",
      });

      // Restart timer
      setCanResend(false);
      setResendTimer(60);
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Non riesco a inviare il codice. Riprova tra poco.",
        variant: "destructive"
      });
    } finally {
      setIsSendingOtp(false);
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
              <form onSubmit={handleReviewSubmit} className="space-y-6">
                {/* Nome e Email */}
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
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      placeholder="tua@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Città */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Città (opzionale)</label>
                  <Input
                    placeholder="Milano"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
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
                  disabled={isSendingOtp}
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Invio codice...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Invia Recensione
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <Dialog open={step === 'otp'} onOpenChange={() => setStep('review')}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Verifica la tua email</DialogTitle>
            <DialogDescription className="text-center">
              Abbiamo inviato un codice a 6 cifre a <strong>{email}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <OTPInput 
              onComplete={handleOtpComplete} 
              disabled={isVerifying || isSubmitting}
            />

            {isVerifying && (
              <p className="text-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Verifica in corso...
              </p>
            )}

            {isSubmitting && (
              <p className="text-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Salvataggio recensione...
              </p>
            )}

            <div className="text-center space-y-2">
              {!canResend ? (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  Richiedi nuovo codice tra {resendTimer}s
                </p>
              ) : (
                <Button
                  variant="ghost"
                  onClick={handleResendOtp}
                  disabled={isSendingOtp}
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Invio...
                    </>
                  ) : (
                    'Invia nuovo codice'
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubmitReview;
