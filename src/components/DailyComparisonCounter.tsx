import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

export const DailyComparisonCounter = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const calculateCount = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Ore 7:00 = 19 comparazioni
      // Ogni ora +28
      // Dalle 7:00 alle 23:59
      
      if (currentHour < 7) {
        // Prima delle 7, mostra il conteggio finale del giorno precedente
        return 19 + (16 * 28); // 16 ore (7-23) = 467
      } else if (currentHour >= 23) {
        // Dopo le 23, mostra il conteggio finale
        return 19 + (16 * 28); // 467
      } else {
        // Durante il giorno, calcola in base all'ora
        const hoursSince7 = currentHour - 7;
        return 19 + (hoursSince7 * 28);
      }
    };

    setCount(calculateCount());

    // Aggiorna ogni minuto per essere precisi
    const interval = setInterval(() => {
      setCount(calculateCount());
    }, 60000); // 1 minuto

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
      <TrendingUp className="w-4 h-4 text-primary" />
      <span className="text-sm font-semibold text-primary">
        {count} comparazioni oggi
      </span>
    </div>
  );
};
