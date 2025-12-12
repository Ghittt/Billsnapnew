import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Search, Shield, Building2 } from 'lucide-react';
import { ProviderBadge } from '@/components/results/ProviderLogo';

interface MethodSectionProps {
  offersCount: number;
  providersCount: number;
  providers: string[];
}

export const MethodSection: React.FC<MethodSectionProps> = ({
  offersCount,
  providersCount,
  providers
}) => {
  return (
    <Card className='border shadow-sm bg-gray-50/50'>
      <CardContent className='p-6 md:p-8 space-y-6'>
        {/* Header */}
        <div>
          <h2 className='text-2xl font-bold'>Come abbiamo fatto l'analisi</h2>
          <p className='text-sm text-muted-foreground'>Perché puoi fidarti di questi numeri</p>
        </div>
        
        {/* Metodologia */}
        <ul className='list-disc list-outside pl-5 space-y-2 text-base text-foreground/90'>
          <li>
            Abbiamo estratto in automatico i dati principali dalla tua bolletta (consumo annuo, fornitore, tipo di contratto, prezzo per kWh e costi fissi).
          </li>
          <li>
            Abbiamo confrontato questi dati con le offerte disponibili di più fornitori reali utilizzando condizioni pubbliche aggiornate.
          </li>
          <li>
            Abbiamo calcolato la spesa stimata per ciascuna offerta e selezionato solo quella con il miglior rapporto tra prezzo, stabilità e semplicità delle condizioni.
          </li>
        </ul>

        {/* Fornitori Analizzati Section */}
        {providers && providers.length > 0 && (
          <div className='pt-4 border-t space-y-4'>
            <div className='flex items-center gap-2'>
              <Shield className='w-5 h-5 text-primary' />
              <h3 className='text-lg font-semibold'>Fornitori già analizzati per te</h3>
            </div>
            
            <p className='text-sm text-muted-foreground'>
              Abbiamo analizzato <span className='font-semibold text-primary'>{offersCount} offerte</span> da{' '}
              <span className='font-semibold text-primary'>{providersCount} fornitori</span>. 
              Non devi controllare questi fornitori: li abbiamo già esaminati per te.
            </p>

            <div className='flex flex-wrap gap-2'>
              {providers.map((provider, idx) => (
                <ProviderBadge key={idx} provider={provider} size='sm' />
              ))}
            </div>

            <div className='flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg'>
              <CheckCircle2 className='w-5 h-5 text-green-600 flex-shrink-0 mt-0.5' />
              <p className='text-sm text-green-800'>
                <strong>Risparmia tempo:</strong> Se ti stai chiedendo "Ma ho controllato anche [fornitore]?", 
                la risposta è sì! Tutti i fornitori qui sopra sono stati inclusi nel confronto.
              </p>
            </div>
          </div>
        )}

        <p className='text-xs text-muted-foreground pt-4 mt-2 border-t'>
          Questi valori sono stime basate sui tuoi consumi e sui prezzi disponibili oggi. Controlla sempre i dettagli sul sito del fornitore prima di sottoscrivere.
        </p>
      </CardContent>
    </Card>
  );
};
