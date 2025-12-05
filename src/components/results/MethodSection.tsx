import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface MethodSectionProps {
  offersCount: number;
  providersCount: number;
  providers: string[];
}

export const MethodSection: React.FC<MethodSectionProps> = () => {
  return (
    <Card className='border shadow-sm bg-gray-50/50'>
      <CardContent className='p-6 md:p-8 space-y-4'>
        <div>
          <h2 className='text-2xl font-bold'>Come abbiamo fatto l'analisi</h2>
          <p className='text-sm text-muted-foreground'>Perché puoi fidarti di questi numeri</p>
        </div>
        
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

        <p className='text-xs text-muted-foreground pt-4 mt-2 border-t'>
          Questi valori sono stime basate sui tuoi consumi e sui prezzi disponibili oggi. Controlla sempre i dettagli sul sito del fornitore prima di sottoscrivere.
        </p>
      </CardContent>
    </Card>
  );
};
