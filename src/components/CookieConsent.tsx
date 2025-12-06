import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Cookie, X, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // sempre attivi
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem('billsnap_cookie_consent');
    if (!consent) {
      // Mostra il banner dopo 1 secondo
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('billsnap_cookie_consent', JSON.stringify({
      ...prefs,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }));
    
    // Inizializza Google Analytics solo se accettato
    if (prefs.analytics && typeof gtag !== 'undefined') {
      gtag('event', 'cookie_consent_granted', {
        event_category: 'consent',
        analytics_enabled: true
      });
    }
    
    setIsVisible(false);
  };

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    savePreferences(allAccepted);
  };

  const acceptNecessary = () => {
    savePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
    });
  };

  const saveCustom = () => {
    savePreferences(preferences);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-primary/20 shadow-2xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Cookie className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Gestione Cookie</h3>
                <p className="text-sm text-muted-foreground">
                  Rispettiamo la tua privacy
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={acceptNecessary}
              className="shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {!showDetails ? (
            <>
              <p className="text-sm text-muted-foreground">
                Utilizziamo cookie tecnici necessari per il funzionamento del sito e, 
                con il tuo consenso, cookie analitici per migliorare l'esperienza utente. 
                I tuoi dati sono trattati secondo il <Link to="/cookie-policy" className="text-primary hover:underline">GDPR</Link>.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={acceptAll} 
                  className="flex-1"
                  size="lg"
                >
                  Accetta tutto
                </Button>
                <Button 
                  onClick={acceptNecessary} 
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Solo necessari
                </Button>
                <Button
                  onClick={() => setShowDetails(true)}
                  variant="ghost"
                  className="gap-2"
                  size="lg"
                >
                  <Settings className="w-4 h-4" />
                  Personalizza
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">Cookie Necessari</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Essenziali per il funzionamento del sito (autenticazione, sessione, sicurezza). 
                        Non possono essere disattivati.
                      </p>
                    </div>
                    <Checkbox 
                      checked={true} 
                      disabled 
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="p-4 bg-secondary/20 rounded-lg">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">Cookie Analitici</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ci aiutano a capire come utilizzi il sito per migliorare l'esperienza (Google Analytics). 
                        Dati aggregati e anonimi.
                      </p>
                    </div>
                    <Checkbox
                      checked={preferences.analytics}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({ ...prev, analytics: checked as boolean }))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="p-4 bg-secondary/20 rounded-lg">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">Cookie Marketing</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Attualmente non utilizziamo cookie di marketing. 
                        Questa opzione è prevista per funzionalità future.
                      </p>
                    </div>
                    <Checkbox
                      checked={preferences.marketing}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({ ...prev, marketing: checked as boolean }))
                      }
                      disabled
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button 
                  onClick={saveCustom} 
                  className="flex-1"
                  size="lg"
                >
                  Salva preferenze
                </Button>
                <Button 
                  onClick={() => setShowDetails(false)} 
                  variant="outline"
                  size="lg"
                >
                  Indietro
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Puoi modificare queste impostazioni in qualsiasi momento. 
                <Link to="/cookie-policy" className="text-primary hover:underline ml-1">
                  Maggiori informazioni
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
