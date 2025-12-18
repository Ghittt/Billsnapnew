import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";

interface ProfilePopupStep1Props {
  open: boolean;
  codiceFiscale?: string | null;
  onNext: (dataNascita: string) => void;
}

/**
 * Extracts birth date from Italian codice fiscale
 * Format: AAABBB12C34D567E
 * Characters 7-8 = year (2 digits)
 * Character 9 = month (A-E, H, L-N, P-R, S-T = Jan-Dec)
 * Characters 10-11 = day (01-31 for male, 41-71 for female)
 */
function extractBirthDateFromCF(cf: string): string | null {
  if (!cf || cf.length !== 16) return null;
  
  const monthMap: Record<string, string> = {
    'A': '01', 'B': '02', 'C': '03', 'D': '04', 'E': '05',
    'H': '06', 'L': '07', 'M': '08', 'P': '09', 'R': '10',
    'S': '11', 'T': '12'
  };
  
  try {
    const yearPart = cf.substring(6, 8);
    const monthChar = cf.charAt(8).toUpperCase();
    const dayPart = parseInt(cf.substring(9, 11), 10);
    
    const month = monthMap[monthChar];
    if (!month) return null;
    
    // Day > 40 means female (subtract 40)
    const day = dayPart > 40 ? dayPart - 40 : dayPart;
    
    // Assume 19xx for years > 30, 20xx otherwise
    const yearNum = parseInt(yearPart, 10);
    const fullYear = yearNum > 30 ? 1900 + yearNum : 2000 + yearNum;
    
    // Return in DDMMYYYY format (no separators)
    return `${String(day).padStart(2, '0')}${month}${fullYear}`;
  } catch {
    return null;
  }
}

/**
 * Parses date input and auto-formats with slashes (DD/MM/YYYY)
 */
function formatDateInput(input: string): string {
  // Remove all non-digits
  const digitsOnly = input.replace(/\D/g, '');
  
  // Auto-format with slashes as user types
  if (digitsOnly.length <= 2) {
    return digitsOnly; // DD
  } else if (digitsOnly.length <= 4) {
    return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`; // DD/MM
  } else {
    return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`; // DD/MM/YYYY
  }
}

/**
 * Strips slashes from formatted date to get DDMMYYYY
 */
function stripSlashes(input: string): string {
  return input.replace(/\//g, '');
}

/**
 * Converts DDMMYYYY to DD/MM/YYYY for display purposes
 */
function formatForDisplay(input: string): string {
  if (input.length === 8) {
    const day = input.substring(0, 2);
    const month = input.substring(2, 4);
    const year = input.substring(4, 8);
    return `${day}/${month}/${year}`;
  }
  return input;
}

/**
 * Validates date format (accepts both DDMMYYYY and DD/MM/YYYY)
 */
function isValidDate(date: string): boolean {
  // Strip slashes for validation
  const cleanDate = date.replace(/\//g, '');
  if (cleanDate.length !== 8) return false;
  
  const day = parseInt(cleanDate.substring(0, 2), 10);
  const month = parseInt(cleanDate.substring(2, 4), 10);
  const year = parseInt(cleanDate.substring(4, 8), 10);
  
  if (day < 1 || day > 31) return false;
  if (month < 1 || month > 12) return false;
  if (year < 1900 || year > 2025) return false;
  
  return true;
}

export function ProfilePopupStep1({ open, codiceFiscale, onNext }: ProfilePopupStep1Props) {
  const [dataNascita, setDataNascita] = useState("");
  const [isPreFilled, setIsPreFilled] = useState(false);

  useEffect(() => {
    if (codiceFiscale) {
      const extracted = extractBirthDateFromCF(codiceFiscale);
      if (extracted) {
        // Format with slashes for display
        setDataNascita(formatForDisplay(extracted));
        setIsPreFilled(true);
      }
    }
  }, [codiceFiscale]);

  const handleSubmit = () => {
    const cleanDate = stripSlashes(dataNascita);
    if (isValidDate(cleanDate)) {
      // Convert to DD/MM/YYYY for downstream processing
      onNext(formatForDisplay(cleanDate));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(e.target.value);
    setDataNascita(formatted);
    setIsPreFilled(false);
  };

  return (
    <Dialog open={open} modal>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Per completare l'analisi ti chiedo una conferma rapida
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Usiamo queste informazioni solo per offrirti il risparmio più preciso possibile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dataNascita">Confermi la tua data di nascita?</Label>
            <Input
              id="dataNascita"
              placeholder="GG/MM/AAAA (es. 19/03/1981)"
              value={dataNascita}
              onChange={handleInputChange}
              maxLength={10}
              inputMode="numeric"
              className={isPreFilled ? "bg-primary/5 border-primary/30" : ""}
            />
            {dataNascita.replace(/\//g, '').length === 8 && isValidDate(dataNascita) && (
              <p className="text-xs text-green-600 font-medium">
                ✓ Data valida: {dataNascita}
              </p>
            )}
            {isPreFilled && (
              <p className="text-xs text-muted-foreground">
                Abbiamo precompilato la data dal tuo codice fiscale
              </p>
            )}
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          className="w-full" 
          size="lg"
          disabled={!isValidDate(dataNascita)}
        >
          Avanti →
        </Button>
      </DialogContent>
    </Dialog>
  );
}
