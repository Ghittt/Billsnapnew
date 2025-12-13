import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Star, Instagram, Sparkles, Loader2, Mail, Clock, Home, CheckCircle2, ShieldCheck, User, ArrowLeft, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OTPInput } from '@/components/OTPInput';


// Generate random avatar for users without Instagram
const getRandomAvatar = (name: string) => {
    const seed = name.toLowerCase().replace(/\s+/g, '');
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
};

const SubmitReview = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [location, setLocation] = useState('');
    const [reviewText, setReviewText] = useState('');
    const [stars, setStars] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [useInstagram, setUseInstagram] = useState(true);
    const [instagramUsername, setInstagramUsername] = useState('');

    const [step, setStep] = useState<'review' | 'otp' | 'success'>('review');
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [canResend, setCanResend] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);

    const { toast } = useToast();

    // Generate preview URL based on IG username or random avatar
    const getPreviewUrl = () => {
        if (useInstagram && instagramUsername.trim()) {
            const clean = instagramUsername.replace('@', '').trim();
            return `https://unavatar.io/instagram/${clean}`;
        }
        // Random avatar for users without Instagram
        return getRandomAvatar(name || 'user');
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !email.trim() || !reviewText.trim() || stars === 0) {
            toast({
                title: "Campi mancanti",
                description: "Completa tutti i campi e seleziona una valutazione",
                variant: "destructive"
            });
            return;
        }

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
            const { error } = await supabase.functions.invoke('send-review-otp', {
                body: { email: email.trim().toLowerCase() }
            });

            if (error) throw error;

            toast({
                title: "Codice inviato!",
                description: `Controlla la tua email: ${email}`,
            });

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
                description: "Non riesco a inviare il codice. Riprova.",
                variant: "destructive"
            });
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleOtpComplete = async (code: string) => {
        setIsVerifying(true);
        try {
            const { data, error } = await supabase.functions.invoke('verify-review-otp', {
                body: { email: email.trim().toLowerCase(), code }
            });

            if (error) throw error;

            if (data?.verified) {
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
        } finally {
            setIsVerifying(false);
        }
    };

    const saveReview = async (verificationCodeId: string) => {
        setIsSubmitting(true);
        try {
            // Build photo URL at submit time (not with separate button)
            const cleanIgUsername = useInstagram && instagramUsername.trim()
                ? instagramUsername.replace('@', '').trim()
                : null;
            const profilePhotoUrl = cleanIgUsername
                ? `https://unavatar.io/instagram/${cleanIgUsername}`
                : getRandomAvatar(name);

            const { error } = await supabase.functions.invoke('save-feedback', {
                body: {
                    email: email.trim().toLowerCase(),
                    review_name: name.trim(),
                    review_location: location.trim() || null,
                    message: reviewText.trim(),
                    rating: stars,
                    category: 'other',
                    instagram_username: cleanIgUsername,
                    profile_photo_url: profilePhotoUrl,
                    email_verified: true,
                    verification_code_id: verificationCodeId,
                    timestamp: new Date().toISOString(),
                }
            });

            if (error) throw error;
            setStep('success');
        } catch (error) {
            console.error('Submit error:', error);
            toast({
                title: "Errore",
                description: "Non riesco a salvare la recensione.",
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
            await supabase.functions.invoke('send-review-otp', {
                body: { email: email.trim().toLowerCase() }
            });
            toast({ title: "Codice reinviato!" });
            setCanResend(false);
            setResendTimer(60);
            const timer = setInterval(() => {
                setResendTimer((prev) => {
                    if (prev <= 1) { setCanResend(true); clearInterval(timer); return 0; }
                    return prev - 1;
                });
            }, 1000);
        } catch {
            toast({ title: "Errore", variant: "destructive" });
        } finally {
            setIsSendingOtp(false);
        }
    };

    // Success Screen
    if (step === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#9b87f5] to-[#7E69AB] flex flex-col items-center justify-center p-6 text-white text-center">
                <div className="bg-white/10 backdrop-blur-xl p-12 rounded-3xl shadow-2xl max-w-lg w-full border border-white/20">
                    <div className="bg-white rounded-full p-6 mb-8 mx-auto w-fit shadow-xl">
                        <CheckCircle2 className="w-16 h-16 text-[#9b87f5]" />
                    </div>

                    <h1 className="text-4xl font-bold mb-4">Grazie!</h1>
                    <p className="text-xl text-white/90 mb-8">La tua recensione è stata inviata e sarà pubblicata dopo l'approvazione.</p>

                    <div className="flex justify-center gap-1 mb-8">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                        ))}
                    </div>

                    <Link to="/">
                        <Button className="bg-white text-[#9b87f5] hover:bg-white/90 font-bold text-lg px-8 py-6 rounded-xl w-full">
                            <Home className="w-5 h-5 mr-2" />
                            Torna alla Home
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const previewUrl = getPreviewUrl();

    return (
        <div className="min-h-screen bg-background">
            <Header />

            {/* Hero */}
            <div className="bg-gradient-to-br from-[#9b87f5] via-[#8B5CF6] to-[#7E69AB] text-white py-12 md:py-16">
                <div className="container mx-auto px-4 text-center">
                    <Link to="/recensioni" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Torna alle recensioni</span>
                    </Link>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                        Lascia una Recensione
                    </h1>
                    <p className="text-lg text-white/80 max-w-xl mx-auto">
                        Condividi la tua esperienza con BillSnap
                    </p>
                </div>
            </div>

            {/* Form */}
            <div className="container mx-auto px-4 py-12">
                <div className="max-w-2xl mx-auto">
                    <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                                <Sparkles className="w-6 h-6 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">La tua esperienza</CardTitle>
                            <CardDescription>Bastano pochi secondi</CardDescription>
                        </CardHeader>

                        <CardContent className="pt-6">
                            <form onSubmit={handleReviewSubmit} className="space-y-6">

                                {/* Star Rating */}
                                <div className="text-center p-6 bg-secondary/10 rounded-xl">
                                    <Label className="text-lg font-medium block mb-4">Come valuti BillSnap?</Label>
                                    <div className="flex justify-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setStars(star)}
                                                onMouseEnter={() => setHoveredStar(star)}
                                                onMouseLeave={() => setHoveredStar(0)}
                                                className="transition-transform hover:scale-110 active:scale-95 p-1"
                                            >
                                                <Star
                                                    className={`w-10 h-10 md:w-12 md:h-12 transition-colors ${(hoveredStar || stars) >= star
                                                            ? 'fill-primary text-primary'
                                                            : 'text-gray-200 fill-gray-100'
                                                        }`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground h-5">
                                        {hoveredStar === 1 || stars === 1 ? 'Pessima 😞' :
                                            hoveredStar === 2 || stars === 2 ? 'Scarsa 😐' :
                                                hoveredStar === 3 || stars === 3 ? 'Buona 🙂' :
                                                    hoveredStar === 4 || stars === 4 ? 'Ottima 😊' :
                                                        hoveredStar === 5 || stars === 5 ? 'Eccezionale! 🤩' : ''}
                                    </p>
                                </div>

                                {/* Name & Email */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nome *</Label>
                                        <Input placeholder="Il tuo nome" value={name} onChange={(e) => setName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email *</Label>
                                        <Input type="email" placeholder="tua@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="space-y-2">
                                    <Label>Città (opzionale)</Label>
                                    <Input placeholder="Milano" value={location} onChange={(e) => setLocation(e.target.value)} />
                                </div>

                                {/* Review */}
                                <div className="space-y-2">
                                    <Label>La tua recensione *</Label>
                                    <Textarea
                                        placeholder="Racconta la tua esperienza con BillSnap..."
                                        value={reviewText}
                                        onChange={(e) => setReviewText(e.target.value)}
                                        rows={4}
                                        className="resize-none"
                                    />
                                </div>

                                {/* Instagram Photo Option - IMPROVED UX */}
                                <div className="space-y-4 p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border border-purple-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg transition-colors ${useInstagram ? 'bg-gradient-to-br from-pink-500 to-purple-600' : 'bg-gray-100'}`}>
                                                <Instagram className={`w-5 h-5 ${useInstagram ? 'text-white' : 'text-gray-400'}`} />
                                            </div>
                                            <div>
                                                <Label className="font-medium cursor-pointer" onClick={() => setUseInstagram(!useInstagram)}>
                                                    Aggiungi foto Instagram
                                                </Label>
                                                <p className="text-xs text-muted-foreground">Facoltativo</p>
                                            </div>
                                        </div>

                                        {/* Info Tooltip */}
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button type="button" className="p-1.5 hover:bg-white/50 rounded-full transition-colors">
                                                    <Info className="w-4 h-4 text-purple-400" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="left" className="max-w-xs text-sm">
                                                <p className="font-medium mb-1">🔒 Privacy Garantita</p>
                                                <p>Utilizziamo solo la tua <strong>foto profilo pubblica</strong> per mostrare il tuo avatar nella recensione. Non accediamo ai tuoi contenuti, follower o altre informazioni.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>

                                    {/* Toggle Switch styled as button */}
                                    <button
                                        type="button"
                                        onClick={() => setUseInstagram(!useInstagram)}
                                        className={`w-full py-3 px-4 rounded-lg border-2 transition-all font-medium text-sm flex items-center justify-center gap-2 ${useInstagram
                                                ? 'bg-white border-purple-300 text-purple-700 shadow-sm'
                                                : 'bg-transparent border-dashed border-gray-200 text-gray-500 hover:border-purple-200 hover:text-purple-600'
                                            }`}
                                    >
                                        {useInstagram ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" />
                                                Foto Instagram attiva
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                Usa avatar random
                                            </>
                                        )}
                                    </button>

                                    {/* Instagram Username Input - Only shown when toggle is ON */}
                                    {useInstagram && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <Input
                                                placeholder="@il_tuo_username"
                                                value={instagramUsername}
                                                onChange={(e) => setInstagramUsername(e.target.value)}
                                                className="bg-white"
                                            />

                                            {/* Live Preview */}
                                            {previewUrl && (
                                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-100 shadow-sm">
                                                    <Avatar className="w-10 h-10 border-2 border-purple-200">
                                                        <AvatarImage src={previewUrl} />
                                                        <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{name || 'Il tuo nome'}</p>
                                                        <p className="text-xs text-muted-foreground">Anteprima della tua recensione</p>
                                                    </div>
                                                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                </div>
                                            )}

                                            {/* Privacy note inline */}
                                            <p className="text-xs text-purple-600/70 flex items-center gap-1">
                                                <ShieldCheck className="w-3 h-3" />
                                                Solo la foto profilo pubblica verrà utilizzata
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Submit */}
                                <Button type="submit" className="w-full py-6 text-lg font-bold rounded-xl" disabled={isSendingOtp}>
                                    {isSendingOtp ? (
                                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Invio codice...</>
                                    ) : (
                                        <><Mail className="w-5 h-5 mr-2" /> Invia Recensione</>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* OTP Modal */}
            <Dialog open={step === 'otp'} onOpenChange={() => !isVerifying && !isSubmitting && setStep('review')}>
                <DialogContent className="sm:max-w-md rounded-2xl p-8">
                    <DialogHeader className="text-center space-y-3">
                        <div className="mx-auto bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center">
                            <ShieldCheck className="w-7 h-7 text-primary" />
                        </div>
                        <DialogTitle className="text-2xl">Verifica Email</DialogTitle>
                        <DialogDescription className="text-base">
                            Abbiamo inviato un codice a <strong>{email}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="flex justify-center">
                            <OTPInput onComplete={handleOtpComplete} disabled={isVerifying || isSubmitting} />
                        </div>

                        {(isVerifying || isSubmitting) && (
                            <p className="text-center text-sm text-primary animate-pulse flex items-center justify-center">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                {isVerifying ? 'Verifico...' : 'Salvataggio...'}
                            </p>
                        )}

                        <div className="text-center border-t pt-4">
                            {!canResend ? (
                                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                                    <Clock className="w-4 h-4" /> Nuovo codice tra {resendTimer}s
                                </p>
                            ) : (
                                <Button variant="ghost" onClick={handleResendOtp} disabled={isSendingOtp}>
                                    Invia nuovo codice
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
