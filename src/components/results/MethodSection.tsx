import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';

interface MethodSectionProps {
  offersCount: number;
  providersCount: number;
  providers: string[];
}

// Lista completa dei fornitori che analizziamo
const ALL_PROVIDERS = [
  'Enel Energia',
  'Eni Plenitude', 
  'Edison',
  'A2A',
  'Sorgenia',
  'Iren',
  'Hera',
  'Illumia',
  'Wekiwi',
  'Octopus Energy',
  'NeN',
  'Acea',
  'E.ON'
];

export const MethodSection: React.FC<MethodSectionProps> = () => {
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

        {/* Fornitori Analizzati Section - STATIC LIST */}
        <div className='pt-4 border-t space-y-4'>
          <div className='flex items-center gap-2'>
            <Shield className='w-5 h-5 text-primary' />
            <h3 className='text-lg font-semibold'>Analizziamo tutte le offerte convenienti sul mercato</h3>
          </div>
          
          <p className='text-sm text-muted-foreground'>
            Confrontiamo le offerte dei principali fornitori del mercato libero italiano per trovare quella più adatta al tuo profilo di consumo.
          </p>

          <div className='flex flex-wrap gap-2'>
            {ALL_PROVIDERS.map((provider, idx) => (
              <span 
                key={idx} 
                className='inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200'
              >
                {provider}
              </span>
            ))}
          </div>
        </div>

        <p className='text-xs text-muted-foreground pt-4 mt-2 border-t'>
          Questi valori sono stime basate sui tuoi consumi e sui prezzi disponibili oggi. Controlla sempre i dettagli sul sito del fornitore prima di sottoscrivere.
        </p>
      </CardContent>
    </Card>
  );
};
