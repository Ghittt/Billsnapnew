import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Privacy Policy
            </h1>
            <p className="text-foreground">
              La tua privacy è importante per noi
            </p>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Raccolta Dati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground">
                BillSnap raccoglie unicamente i dati necessari per fornire il servizio di analisi bollette:
              </p>
              <ul className="space-y-2 text-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Immagini delle bollette caricate (elaborate e non archiviate)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Dati di consumo energetico estratti dalle bollette</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Informazioni anonime di utilizzo dell'app</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Uso dei Dati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground">I tuoi dati vengono utilizzati esclusivamente per:</p>
              <ul className="space-y-2 text-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Calcolare il potenziale risparmio energetico</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Fornire raccomandazioni personalizzate</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Migliorare la qualità del servizio</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Sicurezza</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground">
                Implementiamo misure di sicurezza avanzate per proteggere i tuoi dati.
                Le bollette vengono elaborate e poi eliminate dai nostri server.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Contatti</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">
                Per domande sulla privacy: <a href="mailto:privacy@billsnap.app" className="text-primary underline font-medium">privacy@billsnap.app</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
