import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

export const DailyComparisonCounter = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const calculateCount = () => {
      // Configurazione: Data Inizio e Rateo di crescita
      const startDate = new Date('2024-10-01T00:00:00').getTime();
      const now = new Date().getTime();
      const hoursAndMinutes = new Date();
      
      // Calcola giorni passati
      const daysPassed = (now - startDate) / (1000 * 60 * 60 * 24);
      
      // Base: 1200 bollette iniziali + ~45 al giorno
      const baseCount = 1200 + Math.floor(daysPassed * 45);
      
      // Aggiunge variazione intra-day basata sull'ora (più attività di giorno)
      const hour = hoursAndMinutes.getHours();
      const minute = hoursAndMinutes.getMinutes();
      
      // Simulazione attività giornaliera (0-45 bollette aggiuntive durante il giorno)
      let dailyProgress = 0;
      if (hour >= 7 && hour < 23) {
         dailyProgress = Math.floor(((hour - 7) * 60 + minute) / 20); // 1 ogni 20 min circa
      } else if (hour >= 23) {
         dailyProgress = 45; // Max del giorno
      } else {
         // Di notte mantiene il max del giorno precedente + eventuale piccolo incremento
         dailyProgress = 45; 
      }

      return baseCount + dailyProgress;
    };

    setCount(calculateCount());

    const interval = setInterval(() => {
      setCount(calculateCount());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
      <TrendingUp className="w-3.5 h-3.5 text-primary flex-shrink-0" />
      <span className="text-xs font-semibold text-primary whitespace-nowrap">
        {count.toLocaleString('it-IT')} bollette analizzate
      </span>
    </div>
  );
};
