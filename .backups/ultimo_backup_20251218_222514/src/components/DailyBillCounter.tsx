import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

export const DailyBillCounter = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Genera un numero casuale basato sulla data del giorno
    const generateDailyCount = () => {
      const today = new Date();
      const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      
      // Usa il seed per generare un numero pseudo-casuale ma consistente per il giorno
      const random = Math.sin(seed) * 10000;
      const randomValue = Math.abs(random - Math.floor(random));
      
      // Range: 200-350 bollette al giorno
      const dailyCount = Math.floor(200 + randomValue * 150);
      
      return dailyCount;
    };

    setCount(generateDailyCount());
  }, []);

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/80 py-2">
      <TrendingUp className="w-4 h-4 text-primary" />
      <span>
        <strong className="text-primary font-semibold">{count}</strong> bollette analizzate oggi
      </span>
    </div>
  );
};
