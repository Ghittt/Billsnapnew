import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface ManualBillInputFallbackProps {
  onSubmit: (data: {
    provider: string;
    annualKwh: number;
    totalCostEur?: number;
  }) => void;
  onCancel: () => void;
}

const COMMON_PROVIDERS = [
  'Enel Energia',
  'Edison',
  'Eni Plenitude',
  'A2A Energia',
  'Acea Energia',
  'Hera Comm',
  'Iren Mercato',
  'Sorgenia',
  'Altro'
];

export const ManualBillInputFallback: React.FC<ManualBillInputFallbackProps> = ({
  onSubmit,
  onCancel
}) => {
  const [provider, setProvider] = useState('');
  const [customProvider, setCustomProvider] = useState('');
  const [annualKwh, setAnnualKwh] = useState('');
  const [totalCost, setTotalCost] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalProvider = provider === 'Altro' ? customProvider : provider;
    const kwh = parseFloat(annualKwh);
    const cost = totalCost ? parseFloat(totalCost) : undefined;

    if (!finalProvider || !kwh || kwh <= 0) {
      return;
    }

    onSubmit({
      provider: finalProvider,
      annualKwh: kwh,
      totalCostEur: cost
    });
  };

  return (
    <Card className="p-6 glass animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="w-6 h-6 text-primary" />
        <div>
          <h3 className="font-semibold text-lg">Inserisci i dati manualmente</h3>
          <p className="text-sm text-muted-foreground">
            Non riusciamo a leggere la tua bolletta. Inserisci i dati a mano e ti aiuteremo lo stesso.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="provider">Fornitore attuale *</Label>
          <Select value={provider} onValueChange={setProvider} required>
            <SelectTrigger id="provider">
              <SelectValue placeholder="Seleziona il tuo fornitore" />
            </SelectTrigger>
            <SelectContent>
              {COMMON_PROVIDERS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {provider === 'Altro' && (
          <div className="space-y-2">
            <Label htmlFor="customProvider">Nome fornitore *</Label>
            <Input
              id="customProvider"
              value={customProvider}
              onChange={(e) => setCustomProvider(e.target.value)}
              placeholder="Es. Sorgenia"
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="annualKwh">Consumo annuo (kWh) *</Label>
          <Input
            id="annualKwh"
            type="number"
            min="0"
            step="1"
            value={annualKwh}
            onChange={(e) => setAnnualKwh(e.target.value)}
            placeholder="Es. 2500"
            required
          />
          <p className="text-xs text-muted-foreground">
            Lo trovi sulla bolletta come "consumo annuo" o simile
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalCost">Costo totale annuo (€, opzionale)</Label>
          <Input
            id="totalCost"
            type="number"
            min="0"
            step="0.01"
            value={totalCost}
            onChange={(e) => setTotalCost(e.target.value)}
            placeholder="Es. 650"
          />
          <p className="text-xs text-muted-foreground">
            Se lo conosci, ci aiuta a darti un confronto più preciso
          </p>
        </div>

        <div className="flex gap-3">
          <Button type="submit" className="flex-1">
            Continua con questi dati
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Riprova con foto
          </Button>
        </div>
      </form>
    </Card>
  );
};
