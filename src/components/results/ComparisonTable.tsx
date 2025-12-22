import React from 'react';
import { TrendingDown, Lock, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OfferData {
  provider: string;
  name: string;
  monthlyEur: number;
  annualEur: number;
  savingEur: number;
  savingPercent: number;
  priceType: 'fisso' | 'variabile';
  potenzaKw?: number;
  priceKwh?: number;
  fixedMonthly?: number;
  onActivate?: () => void;
}

interface ComparisonTableProps {
  currentProvider: string;
  currentOfferType?: string;
  currentMonthly: number;
  currentAnnual: number;
  currentPotenzaKw?: number;
  currentPriceKwh?: number;
  currentFixedMonthly?: number;
  consumption: number;
  billType: 'luce' | 'gas' | 'combo';
  fixedOffer?: OfferData | null;
  variableOffer?: OfferData | null;
  bestOfferName?: string;
  bestOfferProvider?: string;
  bestOfferMonthly?: number;
  bestOfferAnnual?: number;
  savingAnnual?: number;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  currentProvider, currentOfferType, currentMonthly, currentAnnual, currentPotenzaKw,
  currentPriceKwh,
  currentFixedMonthly,
  consumption, billType, fixedOffer, variableOffer,
  bestOfferName, bestOfferProvider, bestOfferMonthly, bestOfferAnnual, savingAnnual: legacySaving
}) => {
  const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  const hasNewOffers = fixedOffer || variableOffer;
  const effectiveFixedOffer: OfferData | null = fixedOffer || (!hasNewOffers && bestOfferName ? {
    provider: bestOfferProvider || '', name: bestOfferName, monthlyEur: bestOfferMonthly || 0,
    annualEur: bestOfferAnnual || 0, savingEur: legacySaving || 0,
    savingPercent: currentAnnual > 0 ? Math.round(((legacySaving || 0) / currentAnnual) * 100) : 0, priceType: 'fisso'
  } : null);

  const colCount = 2 + (effectiveFixedOffer ? 1 : 0) + (variableOffer ? 1 : 0);

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-lg md:text-xl font-bold text-purple-900">Confronto Dettagliato</h3>

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 border">
          <h4 className="font-bold text-gray-700 mb-3">📄 La Tua Bolletta</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Fornitore:</span><span className="font-semibold">{currentProvider}</span></div>
            <div className="flex justify-between"><span>Costo mensile:</span><span className="font-bold text-lg">{fmt(currentMonthly)}</span></div>
            <div className="flex justify-between"><span>Costo annuale:</span><span className="font-semibold">{fmt(currentAnnual)}</span></div>
            {currentPotenzaKw && <div className="flex justify-between"><span>Potenza:</span><span>{currentPotenzaKw} kW</span></div>}
          </div>
        </div>
        {effectiveFixedOffer && (
          <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-300">
            <div className="flex items-center gap-2 mb-3"><Lock className="h-4 w-4 text-blue-600" /><h4 className="font-bold text-blue-800">Offerta Fissa</h4></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Fornitore:</span><span className="font-semibold">{effectiveFixedOffer.provider}</span></div>
              <div className="flex justify-between"><span>Offerta:</span><span className="font-medium">{effectiveFixedOffer.name}</span></div>
              <div className="flex justify-between"><span>Costo mensile:</span><span className="font-bold text-lg text-blue-700">{fmt(effectiveFixedOffer.monthlyEur)}</span></div>
              <div className="flex justify-between"><span>Costo annuale:</span><span className="font-semibold text-blue-700">{fmt(effectiveFixedOffer.annualEur)}</span></div>
              <div className="flex justify-between bg-green-100 p-2 rounded"><span>Risparmio:</span><span className="font-bold text-green-600">{fmt(effectiveFixedOffer.savingEur)} (-{effectiveFixedOffer.savingPercent}%)</span></div>
            </div>
            {effectiveFixedOffer.onActivate && <Button onClick={effectiveFixedOffer.onActivate} className="w-full mt-4 bg-blue-600 hover:bg-blue-700">Attiva Offerta Fissa</Button>}
          </div>
        )}
        {variableOffer && (
          <div className="bg-green-50 rounded-lg p-4 border-2 border-green-300">
            <div className="flex items-center gap-2 mb-3"><LineChart className="h-4 w-4 text-green-600" /><h4 className="font-bold text-green-800">Offerta Variabile</h4></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Fornitore:</span><span className="font-semibold">{variableOffer.provider}</span></div>
              <div className="flex justify-between"><span>Offerta:</span><span className="font-medium">{variableOffer.name}</span></div>
              <div className="flex justify-between"><span>Costo mensile:</span><span className="font-bold text-lg text-green-700">{fmt(variableOffer.monthlyEur)}</span></div>
              <div className="flex justify-between"><span>Costo annuale:</span><span className="font-semibold text-green-700">{fmt(variableOffer.annualEur)}</span></div>
              <div className="flex justify-between bg-green-100 p-2 rounded"><span>Risparmio:</span><span className="font-bold text-green-600">{fmt(variableOffer.savingEur)} (-{variableOffer.savingPercent}%)</span></div>
            </div>
            {variableOffer.onActivate && <Button onClick={variableOffer.onActivate} className="w-full mt-4 bg-green-600 hover:bg-green-700">Attiva Offerta Variabile</Button>}
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-purple-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Caratteristica</th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-700 bg-gray-50">La Tua Bolletta</th>
              {effectiveFixedOffer && <th className="py-3 px-4 text-sm font-semibold text-blue-700 bg-blue-50"><div className="flex items-center justify-center gap-1"><Lock className="h-4 w-4" /><span>Offerta Fissa</span></div></th>}
              {variableOffer && <th className="py-3 px-4 text-sm font-semibold text-green-700 bg-green-50"><div className="flex items-center justify-center gap-1"><LineChart className="h-4 w-4" /><span>Offerta Variabile</span></div></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="py-3 px-4 font-medium text-sm text-gray-700">Fornitore</td><td className="py-3 px-4 text-center bg-gray-50/30 font-semibold">{currentProvider}</td>{effectiveFixedOffer && <td className="py-3 px-4 text-center bg-blue-50/30 font-semibold text-blue-800">{effectiveFixedOffer.provider}</td>}{variableOffer && <td className="py-3 px-4 text-center bg-green-50/30 font-semibold text-green-800">{variableOffer.provider}</td>}</tr>
            <tr><td className="py-3 px-4 font-medium text-sm text-gray-700">Nome Offerta</td><td className="py-3 px-4 text-center bg-gray-50/30 text-sm">{currentOfferType || 'N/D'}</td>{effectiveFixedOffer && <td className="py-3 px-4 text-center bg-blue-50/30 text-sm font-medium text-blue-800">{effectiveFixedOffer.name}</td>}{variableOffer && <td className="py-3 px-4 text-center bg-green-50/30 text-sm font-medium text-green-800">{variableOffer.name}</td>}</tr>
            <tr className="bg-gray-50/30"><td className="py-3 px-4 font-medium text-sm text-gray-700">Prezzo Energia</td><td className="py-3 px-4 text-center text-sm">{currentPriceKwh ? `€ ${currentPriceKwh.toFixed(3)}/${billType === 'gas' ? 'Smc' : 'kWh'}` : 'N/D'}</td>{effectiveFixedOffer && <td className="py-3 px-4 text-center bg-blue-50/30 text-sm text-blue-700">{effectiveFixedOffer.priceKwh ? `€ ${effectiveFixedOffer.priceKwh.toFixed(3)}/kWh` : 'N/D'}</td>}{variableOffer && <td className="py-3 px-4 text-center bg-green-50/30 text-sm text-green-700">{variableOffer.priceKwh ? `€ ${variableOffer.priceKwh.toFixed(3)}/kWh` : 'N/D'}</td>}</tr>
            <tr className="bg-gray-50/30"><td className="py-3 px-4 font-medium text-sm text-gray-700">Quota Fissa</td><td className="py-3 px-4 text-center text-sm">{currentFixedMonthly ? `€ ${currentFixedMonthly.toFixed(2)}/mese` : 'N/D'}</td>{effectiveFixedOffer && <td className="py-3 px-4 text-center bg-blue-50/30 text-sm text-blue-700">{effectiveFixedOffer.fixedMonthly ? `€ ${effectiveFixedOffer.fixedMonthly.toFixed(2)}/mese` : 'N/D'}</td>}{variableOffer && <td className="py-3 px-4 text-center bg-green-50/30 text-sm text-green-700">{variableOffer.fixedMonthly ? `€ ${variableOffer.fixedMonthly.toFixed(2)}/mese` : 'N/D'}</td>}</tr>
            <tr><td className="py-3 px-4 font-medium text-sm text-gray-700">Costo Mensile</td><td className="py-3 px-4 text-center bg-gray-50/30"><span className="text-xl font-bold text-gray-800">{fmt(currentMonthly)}</span></td>{effectiveFixedOffer && <td className="py-3 px-4 text-center bg-blue-50/30"><div className="flex items-center justify-center gap-1"><TrendingDown className="h-4 w-4 text-blue-600" /><span className="text-xl font-bold text-blue-600">{fmt(effectiveFixedOffer.monthlyEur)}</span></div></td>}{variableOffer && <td className="py-3 px-4 text-center bg-green-50/30"><div className="flex items-center justify-center gap-1"><TrendingDown className="h-4 w-4 text-green-600" /><span className="text-xl font-bold text-green-600">{fmt(variableOffer.monthlyEur)}</span></div></td>}</tr>
            <tr><td className="py-3 px-4 font-medium text-sm text-gray-700">Costo Annuale</td><td className="py-3 px-4 text-center bg-gray-50/30 font-semibold">{fmt(currentAnnual)}</td>{effectiveFixedOffer && <td className="py-3 px-4 text-center bg-blue-50/30 font-semibold text-blue-700">{fmt(effectiveFixedOffer.annualEur)}</td>}{variableOffer && <td className="py-3 px-4 text-center bg-green-50/30 font-semibold text-green-700">{fmt(variableOffer.annualEur)}</td>}</tr>
            {currentPotenzaKw && <tr><td className="py-3 px-4 font-medium text-sm text-gray-700">Potenza</td><td className="py-3 px-4 text-center bg-gray-50/30">{currentPotenzaKw} kW</td>{effectiveFixedOffer && <td className="py-3 px-4 text-center bg-blue-50/30">{effectiveFixedOffer.potenzaKw || currentPotenzaKw} kW</td>}{variableOffer && <td className="py-3 px-4 text-center bg-green-50/30">{variableOffer.potenzaKw || currentPotenzaKw} kW</td>}</tr>}
            <tr className="bg-green-50 border-t-2 border-green-200"><td className="py-4 px-4 font-bold text-sm text-green-900">Risparmio Annuo</td><td className="py-4 px-4 text-center text-gray-400">-</td>{effectiveFixedOffer && <td className="py-4 px-4 text-center"><span className="text-2xl font-bold text-green-600">{fmt(effectiveFixedOffer.savingEur)}</span><span className="block text-sm text-green-700">(-{effectiveFixedOffer.savingPercent}%)</span></td>}{variableOffer && <td className="py-4 px-4 text-center"><span className="text-2xl font-bold text-green-600">{fmt(variableOffer.savingEur)}</span><span className="block text-sm text-green-700">(-{variableOffer.savingPercent}%)</span></td>}</tr>
            <tr className="border-t border-gray-200"><td className="py-3 px-4 font-medium text-sm text-gray-700">Consumo Annuo</td><td colSpan={colCount - 1} className="py-3 px-4 text-center font-semibold">{consumption.toLocaleString('it-IT')} {billType === 'gas' ? 'Smc' : 'kWh'}</td></tr>
            {(effectiveFixedOffer?.onActivate || variableOffer?.onActivate) && <tr className="border-t-2 border-purple-200"><td className="py-4 px-4"></td><td className="py-4 px-4"></td>{effectiveFixedOffer && <td className="py-4 px-4 text-center">{effectiveFixedOffer.onActivate && <Button onClick={effectiveFixedOffer.onActivate} className="bg-blue-600 hover:bg-blue-700 w-full">Attiva Fissa</Button>}</td>}{variableOffer && <td className="py-4 px-4 text-center">{variableOffer.onActivate && <Button onClick={variableOffer.onActivate} className="bg-green-600 hover:bg-green-700 w-full">Attiva Variabile</Button>}</td>}</tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
