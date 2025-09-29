import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Privacy Policy
            </h1>
            <p className="text-muted-foreground">
              La tua privacy è importante per noi
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Raccolta Dati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                BillSnap raccoglie unicamente i dati necessari per fornire il servizio di analisi bollette:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Immagini delle bollette caricate (elaborate e non archiviate)</li>
                <li>Dati di consumo energetico estratti dalle bollette</li>
                <li>Informazioni anonime di utilizzo dell'app</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uso dei Dati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>I tuoi dati vengono utilizzati esclusivamente per:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Calcolare il potenziale risparmio energetico</li>
                <li>Fornire raccomandazioni personalizzate</li>
                <li>Migliorare la qualità del servizio</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sicurezza</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Implementiamo misure di sicurezza avanzate per proteggere i tuoi dati.
                Le bollette vengono elaborate e poi eliminate dai nostri server.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contatti</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Per domande sulla privacy: <a href="mailto:privacy@billsnap.app" className="text-primary underline">privacy@billsnap.app</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;