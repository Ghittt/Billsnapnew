import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

export const DailyComparisonCounter = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const calculateCount = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      if (currentHour < 7) {
        return 19 + (16 * 28);
      } else if (currentHour >= 23) {
        return 19 + (16 * 28);
      } else {
        const hoursSince7 = currentHour - 7;
        return 19 + (hoursSince7 * 28);
      }
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
        {count} bollette analizzate oggi
      </span>
    </div>
  );
};
