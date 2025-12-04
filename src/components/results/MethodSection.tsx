import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ProviderBadge } from './ProviderLogo';

interface MethodSectionProps {
  offersCount: number;
  providersCount: number;
  providers: string[];
}

export const MethodSection: React.FC<MethodSectionProps> = ({
  offersCount,
  providersCount,
  providers,
}) => {
  return (
    <Card className='border'>
      <CardContent className='p-6 md:p-8 space-y-4'>
        <h2 className='text-2xl font-bold'>Come abbiamo fatto l'analisi</h2>
        
        {offersCount > 0 && providersCount > 0 ? (
          <p className='text-base text-foreground leading-relaxed'>
            Per questa analisi abbiamo confrontato{' '}
            <span className='font-semibold'>{offersCount} offerte</span> reali da{' '}
            <span className='font-semibold'>{providersCount} fornitori</span> energetici.
          </p>
        ) : (
          <p className='text-base text-foreground leading-relaxed'>
            Per questa analisi abbiamo confrontato un insieme di offerte reali disponibili sul mercato libero, 
            selezionando solo quelle compatibili con il tuo profilo di consumo.
          </p>
        )}

        {providers.length > 0 && (
          <div className='flex flex-wrap gap-2 pt-2'>
            {providers.map((provider, idx) => (
              <div key={idx} className='opacity-60'>
                <ProviderBadge provider={provider} size='sm' />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
