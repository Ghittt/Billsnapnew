import { Progress } from "@/components/ui/progress";
import { TrendingUp, Euro } from "lucide-react";

interface ProgressBarProps {
  totalSavings: number;
  target?: number;
}

export const ProgressBar = ({ totalSavings, target = 1000 }: ProgressBarProps) => {
  const progress = Math.min((totalSavings / target) * 100, 100);
  
  return (
    <div className="p-6 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/20 rounded-lg">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">I tuoi risparmi</h3>
          <p className="text-sm text-muted-foreground">Obiettivo: €{target}/anno</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Euro className="w-4 h-4 text-primary" />
            <span className="font-bold text-lg text-primary">
              {totalSavings.toFixed(0)}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {progress.toFixed(0)}%
          </span>
        </div>
        
        <Progress value={progress} className="h-3" />
        
        <p className="text-sm text-muted-foreground text-center">
          {progress >= 100 
            ? "🎉 Obiettivo raggiunto! Sei un vero campione del risparmio!"
            : `Ti mancano €${(target - totalSavings).toFixed(0)} per raggiungere l'obiettivo`
          }
        </p>
      </div>
    </div>
  );
};