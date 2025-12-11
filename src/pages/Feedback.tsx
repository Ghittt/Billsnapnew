import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const FeedbackPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    category: '',
    rating: '',
    message: '',
    device: '',
    version: '0.1.0'
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.rating || !formData.message) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('save-feedback', {
        body: {
          ...formData,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent
        }
      });

      if (error) throw error;

      toast({
        title: "Feedback inviato!",
        description: "Grazie per il tuo contributo. Analizzeremo il feedback entro 48h.",
      });

      setFormData({
        email: '',
        category: '',
        rating: '',
        message: '',
        device: '',
        version: '0.1.0'
      });
    } catch (error) {
      console.error('Feedback error:', error);
      toast({
        title: "Errore temporaneo",
        description: "Non riesco a inviare il feedback. Riprova tra qualche minuto.",
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
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
              <MessageSquare className="w-8 h-8 text-primary" />
              Feedback Tester
            </h1>
            <p className="text-foreground">
              Aiutaci a migliorare BillSnap. Il tuo feedback è prezioso per le iterazioni rapide.
              003cbr /003e
              003cspan className="text-sm text-muted-foreground mt-2 inline-block"003e
                💡 Prossimamente: login con Instagram per recensioni verificate
              003c/span003e
            </p>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Invia Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email (opzionale)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tuo@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-foreground">Categoria Feedback *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stability">Stabilità Tecnica (crash, lentezze, errori OCR)</SelectItem>
                      <SelectItem value="ux">Esperienza Utente (chiarezza, semplicità)</SelectItem>
                      <SelectItem value="accuracy">Affidabilità Risultati (risparmio realistico)</SelectItem>
                      <SelectItem value="design">Design & UI (leggibilità, colori)</SelectItem>
                      <SelectItem value="conversion">CTA e Conversione</SelectItem>
                      <SelectItem value="other">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-foreground">Valutazione Generale *</Label>
                  <RadioGroup 
                    value={formData.rating} 
                    onValueChange={(value) => setFormData({...formData, rating: value})}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1" id="r1" />
                      <Label htmlFor="r1">😞 1</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="2" id="r2" />
                      <Label htmlFor="r2">😐 2</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="3" id="r3" />
                      <Label htmlFor="r3">🙂 3</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="4" id="r4" />
                      <Label htmlFor="r4">😊 4</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="5" id="r5" />
                      <Label htmlFor="r5">🤩 5</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device" className="text-foreground">Device/Piattaforma</Label>
                  <Select value={formData.device} onValueChange={(value) => setFormData({...formData, device: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona device" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ios">iOS (iPhone/iPad)</SelectItem>
                      <SelectItem value="android">Android</SelectItem>
                      <SelectItem value="web">Web Browser</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-foreground">Descrizione Dettagliata *</Label>
                  <Textarea
                    id="message"
                    placeholder="Descrivi cosa hai notato, che problemi hai riscontrato o suggerimenti per migliorare..."
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    "Invio in corso..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Invia Feedback
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Altri Canali</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-foreground">
              <p>
                <strong className="text-primary">Email:</strong> <a href="mailto:support@billsnap.it" className="text-primary underline font-medium">support@billsnap.it</a>
              </p>
              <p>
                <strong className="text-primary">Telegram Tester:</strong> <a href="https://t.me/billsnap_tester" className="text-primary underline font-medium">@billsnap_tester</a>
              </p>
              <p className="text-sm text-foreground/70">
                Cicli di iterazione: ogni 7 giorni. Feedback prioritari vengono implementati entro 48h.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;
