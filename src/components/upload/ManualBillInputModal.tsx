import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ManualBillInputModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: any) => void;
}

export const ManualBillInputModal = ({ open, onClose, onSubmit }: ManualBillInputModalProps) => {
  const [consumoAnnuo, setConsumoAnnuo] = useState("2700");
  const [f1Share, setF1Share] = useState(35);
  const [f2Share, setF2Share] = useState(35);
  const [f3Share, setF3Share] = useState(30);
  const [potenzaKw, setPotenzaKw] = useState("3");
  const [fixedFeeMonth, setFixedFeeMonth] = useState("0");

  const normalizeShares = (a: number, b: number, c: number) => {
    const sum = a + b + c;
    if (sum <= 0) return { f1: 0.35, f2: 0.35, f3: 0.30 };
    return { f1: a / sum, f2: b / sum, f3: c / sum };
  };

  const handleSubmit = () => {
    const shares = normalizeShares(f1Share, f2Share, f3Share);
    const annualKwh = Number(consumoAnnuo) || 2700;
    
    const fields = {
      kwh_period: annualKwh,
      f1_kwh: shares.f1 * annualKwh,
      f2_kwh: shares.f2 * annualKwh,
      f3_kwh: shares.f3 * annualKwh,
      potenza_kw: Number(potenzaKw) || 3,
      fixed_fee_month: Number(fixedFeeMonth) || 0
    };

    onSubmit(fields);
  };

  const totalShares = f1Share + f2Share + f3Share;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Inserimento Manuale Dati Bolletta</DialogTitle>
          <DialogDescription>
            Non siamo riusciti a leggere la bolletta. Inserisci manualmente i dati principali per continuare.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bastano 3 dati minimi: consumo annuo, potenza impegnata e ripartizione fasce orarie.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="consumo">Consumo Annuo Stimato (kWh)</Label>
            <Input
              id="consumo"
              type="number"
              value={consumoAnnuo}
              onChange={(e) => setConsumoAnnuo(e.target.value)}
              placeholder="2700"
            />
            <p className="text-xs text-muted-foreground">
              Valore tipico per famiglia: 2400-3000 kWh/anno
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="potenza">Potenza Impegnata (kW)</Label>
            <Input
              id="potenza"
              type="number"
              step="0.5"
              value={potenzaKw}
              onChange={(e) => setPotenzaKw(e.target.value)}
              placeholder="3"
            />
            <p className="text-xs text-muted-foreground">
              Valore tipico: 3 kW (uso domestico standard)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fixed">Quota Fissa Mensile Attuale (€/mese)</Label>
            <Input
              id="fixed"
              type="number"
              step="0.01"
              value={fixedFeeMonth}
              onChange={(e) => setFixedFeeMonth(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Opzionale - Se conosci la quota fissa della tua bolletta
            </p>
          </div>

          <div className="space-y-4">
            <Label>Ripartizione Fasce Orarie (%)</Label>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">F1 (Picco) - {f1Share}%</span>
                  <span className="text-xs text-muted-foreground">Lun-Ven 8-19</span>
                </div>
                <Slider
                  value={[f1Share]}
                  onValueChange={(v) => setF1Share(v[0])}
                  max={100}
                  step={5}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">F2 (Intermedia) - {f2Share}%</span>
                  <span className="text-xs text-muted-foreground">Lun-Ven 7-8, 19-23 + Sab 7-23</span>
                </div>
                <Slider
                  value={[f2Share]}
                  onValueChange={(v) => setF2Share(v[0])}
                  max={100}
                  step={5}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">F3 (Fuori picco) - {f3Share}%</span>
                  <span className="text-xs text-muted-foreground">Notte + Dom + Festivi</span>
                </div>
                <Slider
                  value={[f3Share]}
                  onValueChange={(v) => setF3Share(v[0])}
                  max={100}
                  step={5}
                />
              </div>
            </div>

            {totalShares !== 100 && (
              <p className="text-xs text-muted-foreground">
                Totale: {totalShares}% (verrà normalizzato automaticamente)
              </p>
            )}
            {totalShares === 100 && (
              <p className="text-xs text-green-600">
                ✓ Totale: 100%
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annulla
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            Continua con questi dati
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
