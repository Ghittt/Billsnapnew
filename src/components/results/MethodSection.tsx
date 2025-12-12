import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, ExternalLink } from 'lucide-react';

interface MethodSectionProps {
  offersCount: number;
  providersCount: number;
  providers: string[];
}

// Lista completa dei fornitori con link alle homepage
const ALL_PROVIDERS = [
  // Big players
  { name: 'Enel Energia', url: 'https://www.enel.it' },
  { name: 'Eni Plenitude', url: 'https://eniplenitude.com' },
  { name: 'Edison', url: 'https://www.edison.it' },
  { name: 'A2A', url: 'https://www.a2a.it' },
  { name: 'Hera', url: 'https://www.gruppohera.it' },
  { name: 'Iren', url: 'https://www.iren.it' },
  { name: 'Acea', url: 'https://www.acea.it' },
  // Digital / Innovative
  { name: 'Sorgenia', url: 'https://www.sorgenia.it' },
  { name: 'Octopus Energy', url: 'https://octopusenergy.it' },
  { name: 'NeN', url: 'https://www.nen.it' },
  { name: 'Wekiwi', url: 'https://www.wekiwi.it' },
  { name: 'Illumia', url: 'https://www.illumia.it' },
  { name: 'Pulsee', url: 'https://www.pulsee.it' },
  { name: 'Tate', url: 'https://www.tateenergia.it' },
  // Multinazionali / Grandi
  { name: 'E.ON', url: 'https://www.eon-energia.com' },
  { name: 'Engie', url: 'https://www.engie.it' },
  { name: 'Axpo', url: 'https://www.axpo.com/it' },
  { name: 'Alperia', url: 'https://www.alperia.eu' },
  { name: 'Dolomiti Energia', url: 'https://www.dolomitienergia.it' },
  // Regionali / Multiutility
  { name: 'AGSM AIM', url: 'https://www.agsmaim.it' },
  { name: 'Estra', url: 'https://www.estra.it' },
  { name: 'Duferco', url: 'https://www.dufercoenergia.com' },
  { name: 'Bluenergy', url: 'https://www.bluenergygroup.it' },
  { name: 'Repower', url: 'https://www.repower.com/it' },
  { name: 'Green Network', url: 'https://www.greennetworkenergy.it' },
  { name: 'Optima', url: 'https://www.optimaitalia.com' },
  { name: 'Vivigas', url: 'https://www.vivigas.it' },
  { name: 'Gelsia', url: 'https://www.gelsia.it' },
  { name: 'CVA', url: 'https://www.cva.it' },
  { name: 'Metamer', url: 'https://www.metamer.it' },
  { name: 'Sinergy', url: 'https://www.sinergyluce.it' },
  { name: 'Ubroker', url: 'https://www.ubroker.it' },
  { name: 'Energit', url: 'https://www.energit.it' },
  { name: 'Italgas', url: 'https://www.italgas.it' },
  { name: 'Enne Energia', url: 'https://www.enneenergia.it' },
  { name: 'E-Light', url: 'https://www.e-light.it' },
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
            Confrontiamo le offerte di oltre <strong>50 fornitori</strong> del mercato libero italiano per trovare quella più adatta al tuo profilo di consumo.
          </p>

          <div className='flex flex-wrap gap-2'>
            {ALL_PROVIDERS.map((provider, idx) => (
              <a 
                key={idx}
                href={provider.url}
                target="_blank"
                rel="noopener noreferrer"
                className='inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 hover:text-gray-900 transition-colors'
              >
                {provider.name}
                <ExternalLink className='w-3 h-3 opacity-50' />
              </a>
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
