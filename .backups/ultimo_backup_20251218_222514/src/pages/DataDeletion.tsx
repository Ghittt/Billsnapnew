import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function DataDeletion() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast({
        title: "Email non valida",
        description: "Inserisci un indirizzo email valido",
        variant: "destructive"
      });
      return;
    }

    if (confirmText.toLowerCase() !== 'elimina') {
      toast({
        title: "Conferma richiesta",
        description: 'Scrivi "ELIMINA" per confermare',
        variant: "destructive"
      });
      return;
    }

    if (!acceptTerms) {
      toast({
        title: "Conferma necessaria",
        description: "Devi confermare di comprendere che l'operazione è irreversibile",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Salva la richiesta nel database
      const { error: dbError } = await supabase
        .from('feedback')
        .insert({
          email: email,
          category: 'data_deletion_request',
          rating: 0,
          message: `Richiesta cancellazione dati GDPR. Motivo: ${reason || 'Non specificato'}`,
          ip_hash: 'gdpr_request',
          status: 'pending'
        });

      if (dbError) throw dbError;

      // Invia email di conferma
      const { error: emailError } = await supabase.functions.invoke('send-deletion-confirmation', {
        body: { email, reason }
      });

      if (emailError) {
        console.error('Email error:', emailError);
        // Non bloccare il flusso se l'email fallisce
        toast({
          title: "Richiesta registrata",
          description: "Email di conferma non inviata. Riceverai comunque conferma entro 30 giorni.",
          variant: "default"
        });
      }

      setIsSuccess(true);
      
      toast({
        title: "Richiesta inviata",
        description: "Controlla la tua email per la conferma. Riceverai aggiornamenti entro 30 giorni."
      });

      // Reset form
      setTimeout(() => {
        navigate('/');
      }, 5000);

    } catch (error) {
      console.error('Error submitting deletion request:', error);
      toast({
        title: "Errore",
        description: "Impossibile inviare la richiesta. Riprova o contatta privacy@billsnap.it",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12 max-w-2xl">
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">Richiesta Ricevuta</h2>
              <p className="text-muted-foreground">
                La tua richiesta di cancellazione dati è stata registrata correttamente.
              </p>
              <p className="text-sm text-muted-foreground">
                Riceverai conferma via email entro 30 giorni come previsto dal GDPR (Art. 17).
                Nel frattempo, i tuoi dati saranno bloccati e non più utilizzati.
              </p>
              <Button onClick={() => navigate('/')} size="lg" className="mt-4">
                Torna alla Home
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4 flex items-center gap-2 md:gap-3">
            <Trash2 className="w-6 h-6 md:w-8 md:h-8 text-destructive flex-shrink-0" />
            <span>Richiesta Cancellazione Dati</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Esercita il tuo diritto all'oblio previsto dal GDPR (Art. 17)
          </p>
        </div>

        <Alert className="mb-8 border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-900 dark:text-yellow-200">
            <strong>Attenzione:</strong> Questa operazione è irreversibile. Una volta cancellati, 
            i tuoi dati non potranno essere recuperati. Verranno eliminate tutte le bollette analizzate, 
            i risultati salvati e le informazioni associate al tuo account.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Form di Richiesta GDPR
            </CardTitle>
            <CardDescription>
              Tutti i campi contrassegnati con * sono obbligatori. 
              La richiesta sarà processata entro 30 giorni come previsto dalla normativa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email associata all'account *
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tua@email.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  L'email che hai utilizzato per caricare le bollette o iscriverti ai servizi
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="reason" className="text-sm font-medium">
                  Motivo della richiesta (facoltativo)
                </label>
                <Textarea
                  id="reason"
                  placeholder="Specifica il motivo per cui desideri cancellare i tuoi dati..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isSubmitting}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Questa informazione ci aiuta a migliorare il servizio
                </p>
              </div>

              <div className="space-y-4 p-4 bg-secondary/20 rounded-lg">
                <h3 className="font-semibold text-sm">Dati che verranno cancellati:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• File PDF e immagini delle bollette caricate</li>
                  <li>• Risultati delle analisi OCR e AI</li>
                  <li>• Dati di confronto offerte energetiche</li>
                  <li>• Storico delle interazioni con il servizio</li>
                  <li>• Preferenze e notifiche salvate</li>
                  <li>• Account utente e profilo completo</li>
                </ul>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm" className="text-sm font-medium">
                  Conferma digitando "ELIMINA" *
                </label>
                <Input
                  id="confirm"
                  type="text"
                  placeholder="Digita ELIMINA per confermare"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground leading-tight cursor-pointer"
                >
                  Confermo di aver compreso che questa operazione è <strong>irreversibile</strong> e 
                  che tutti i miei dati verranno cancellati definitivamente dal database. 
                  Accetto che BillSnap proceda alla cancellazione entro 30 giorni come previsto dal GDPR.
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isSubmitting || !email || confirmText.toLowerCase() !== 'elimina' || !acceptTerms}
                  className="flex-1"
                  size="lg"
                >
                  {isSubmitting ? "Invio in corso..." : "Invia Richiesta di Cancellazione"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/terms-and-conditions')}
                  disabled={isSubmitting}
                  size="lg"
                >
                  Annulla
                </Button>
              </div>

              <Alert className="border-primary/20">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Garanzie GDPR:</strong> In conformità al Regolamento UE 2016/679, 
                  hai diritto alla cancellazione immediata dei tuoi dati (diritto all'oblio). 
                  Riceverai conferma scritta via email entro 30 giorni. 
                  Per assistenza: <strong>privacy@billsnap.it</strong>
                </AlertDescription>
              </Alert>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 p-6 bg-secondary/20 rounded-lg">
          <h3 className="font-semibold mb-3">Alternative alla cancellazione</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Se desideri solo gestire meglio i tuoi dati, considera queste opzioni:
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => navigate('/profile')} size="sm">
              Gestisci Profilo
            </Button>
            <Button variant="outline" onClick={() => navigate('/terms-and-conditions')} size="sm">
              Leggi Privacy Policy
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
