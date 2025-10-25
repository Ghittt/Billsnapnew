import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ConfirmDataFormProps {
  tipo: 'luce' | 'gas';
  initialData: {
    fornitore?: string;
    consumo?: number | null;
    spesa?: number | null;
    prezzo?: number | null;
  };
  onConfirm: (data: {
    consumo: number;
    spesa?: number;
    prezzo: number;
  }) => void;
  onCancel?: () => void;
}

export const ConfirmDataForm = ({ tipo, initialData, onConfirm, onCancel }: ConfirmDataFormProps) => {
  const [consumo, setConsumo] = useState(initialData.consumo?.toString() || '');
  const [spesa, setSpesa] = useState(initialData.spesa?.toString() || '');
  const [prezzo, setPrezzo] = useState(initialData.prezzo?.toString() || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedConsumo = parseFloat(consumo.replace(',', '.'));
    const parsedPrezzo = parseFloat(prezzo.replace(',', '.'));
    const parsedSpesa = spesa ? parseFloat(spesa.replace(',', '.')) : undefined;

    if (isNaN(parsedConsumo) || isNaN(parsedPrezzo)) {
      return;
    }

    onConfirm({
      consumo: parsedConsumo,
      spesa: parsedSpesa,
      prezzo: parsedPrezzo
    });
  };

  const unitConsumo = tipo === 'luce' ? 'kWh' : 'Smc';
  const unitPrezzo = tipo === 'luce' ? '€/kWh' : '€/Smc';

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Dati da confermare in 10 secondi</CardTitle>
        <CardDescription>
          La scansione non è chiarissima. Conferma questi valori e ti do il risultato preciso.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {initialData.fornitore && (
            <div className="space-y-2">
              <Label>Fornitore</Label>
              <Input 
                value={initialData.fornitore} 
                disabled 
                className="bg-muted"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="consumo">Consumo annuo ({unitConsumo})</Label>
              <Badge variant="outline" className="text-xs">da confermare</Badge>
            </div>
            <Input
              id="consumo"
              type="text"
              placeholder={`es. ${tipo === 'luce' ? '2700' : '1200'}`}
              value={consumo}
              onChange={(e) => setConsumo(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="prezzo">Prezzo energia ({unitPrezzo})</Label>
              <Badge variant="outline" className="text-xs">da confermare</Badge>
            </div>
            <Input
              id="prezzo"
              type="text"
              placeholder={`es. ${tipo === 'luce' ? '0.22' : '0.85'}`}
              value={prezzo}
              onChange={(e) => setPrezzo(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="spesa">Spesa annua (€) - opzionale</Label>
            <Input
              id="spesa"
              type="text"
              placeholder="es. 650"
              value={spesa}
              onChange={(e) => setSpesa(e.target.value)}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Userò questi dati solo per calcolare la tua bolletta migliore.
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Annulla
            </Button>
          )}
          <Button type="submit" className="flex-1">
            Conferma e continua
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};