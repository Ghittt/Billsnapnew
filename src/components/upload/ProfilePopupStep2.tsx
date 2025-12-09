import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Wallet } from "lucide-react";

interface ProfilePopupStep2Props {
  open: boolean;
  onComplete: (data: { nucleoFamiliare: number; iseeRange: "basso" | "medio" | "alto" }) => void;
}

export function ProfilePopupStep2({ open, onComplete }: ProfilePopupStep2Props) {
  const [nucleoFamiliare, setNucleoFamiliare] = useState<number | null>(null);
  const [iseeRange, setIseeRange] = useState<"basso" | "medio" | "alto" | null>(null);

  const handleSubmit = () => {
    if (nucleoFamiliare !== null && iseeRange !== null) {
      onComplete({ nucleoFamiliare, iseeRange });
    }
  };

  const nucleoOptions = [
    { value: 1, label: "1" },
    { value: 2, label: "2" },
    { value: 3, label: "3" },
    { value: 4, label: "4+" },
  ];

  const iseeOptions: { value: "basso" | "medio" | "alto"; label: string }[] = [
    { value: "basso", label: "Basso" },
    { value: "medio", label: "Medio" },
    { value: "alto", label: "Alto" },
  ];

  return (
    <Dialog open={open} modal>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">
            Ultima cosa veloce
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Serve per capire se puoi accedere a bonus e agevolazioni.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nucleo familiare */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="w-4 h-4 text-primary" />
              Quante persone vivono in casa?
            </div>
            <div className="grid grid-cols-4 gap-2">
              {nucleoOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={nucleoFamiliare === option.value ? "default" : "outline"}
                  size="lg"
                  onClick={() => setNucleoFamiliare(option.value)}
                  className="w-full"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* ISEE range */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="w-4 h-4 text-primary" />
              Come considereresti il reddito della tua famiglia?
            </div>
            <div className="grid grid-cols-3 gap-2">
              {iseeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={iseeRange === option.value ? "default" : "outline"}
                  size="lg"
                  onClick={() => setIseeRange(option.value)}
                  className="w-full"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          className="w-full" 
          size="lg"
          disabled={nucleoFamiliare === null || iseeRange === null}
        >
          Mostra il risultato →
        </Button>
      </DialogContent>
    </Dialog>
  );
}
