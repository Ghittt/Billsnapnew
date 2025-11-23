import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, FileText, Calculator, CheckCircle } from 'lucide-react';

interface ProgressIndicatorProps {
  currentStep: 'upload' | 'staged' | 'ocr' | 'calculate' | 'complete';
  estimatedTime?: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  currentStep, 
  estimatedTime = 25 
}) => {
  const steps = [
    { key: 'upload', label: 'Upload', icon: FileText },
    { key: 'ocr', label: 'OCR', icon: FileText },
    { key: 'calculate', label: 'Calcolo', icon: Calculator },
    { key: 'complete', label: 'Risultato', icon: CheckCircle }
  ];

  const getStepIndex = () => {
    // Map 'staged' to 'upload' for progress display
    const mappedStep = currentStep === 'staged' ? 'upload' : currentStep;
    return steps.findIndex(step => step.key === mappedStep);
  };

  const progressValue = ((getStepIndex() + 1) / steps.length) * 100;

  const getStepMessage = () => {
    switch (currentStep) {
      case 'upload':
        return 'Caricamento file in corso...';
      case 'staged':
        return 'File pronti per l\'analisi';
      case 'ocr':
        return 'Stiamo leggendo i dati della tua bolletta...';
      case 'calculate':
        return 'Confronto con le migliori offerte disponibili...';
      case 'complete':
        return 'Analisi completata!';
      default:
        return 'Elaborazione in corso...';
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Clock className="w-5 h-5" />
            <span className="font-medium">~{estimatedTime}s</span>
          </div>
          <p className="text-foreground font-medium">{getStepMessage()}</p>
        </div>

        <div className="space-y-4">
          <Progress value={progressValue} className="h-3" />
          
          <div className="flex justify-between text-xs">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index <= getStepIndex();
              const isCurrent = index === getStepIndex();
              
              return (
                <div 
                  key={step.key}
                  className={`flex flex-col items-center gap-1 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isActive 
                      ? 'border-primary bg-primary text-primary-foreground' 
                      : 'border-muted-foreground/30'
                  } ${isCurrent ? 'animate-pulse' : ''}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressIndicator;