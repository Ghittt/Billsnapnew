import React from 'react';
import { Check, X, Clock, TrendingDown, TrendingUp } from 'lucide-react';

interface ComparisonTableProps {
  currentProvider: string;
  currentOfferType?: string;
  currentMonthly: number;
  currentAnnual: number;
  bestOfferName: string;
  bestOfferProvider: string;
  bestOfferMonthly: number;
  bestOfferAnnual: number;
  bestOfferPromo?: string | null;
  savingAnnual: number;
  consumption: number;
  billType: 'luce' | 'gas' | 'combo';
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  currentProvider,
  currentOfferType,
  currentMonthly,
  currentAnnual,
  bestOfferName,
  bestOfferProvider,
  bestOfferMonthly,
  bestOfferAnnual,
  bestOfferPromo,
  savingAnnual,
  consumption,
  billType
}) => {
  const hasPromo = bestOfferPromo && bestOfferPromo.trim() !== '';
  const savingPercentage = currentAnnual > 0 ? Math.round((savingAnnual / currentAnnual) * 100) : 0;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xl font-bold text-purple-900">Confronto Dettagliato</h3>
        {hasPromo && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold animate-pulse">
            <Clock className="h-3 w-3" />
            Promo a Tempo
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-purple-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Caratteristica</th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-700 bg-gray-50 rounded-tl-lg">
                La Tua Offerta
              </th>
              <th className="py-3 px-4 text-sm font-semibold text-purple-700 bg-purple-50 rounded-tr-lg">
                Offerta Consigliata
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Fornitore */}
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="py-4 px-4 font-medium text-sm text-gray-700">Fornitore</td>
              <td className="py-4 px-4 text-center bg-gray-50/30">
                <span className="font-semibold text-gray-800">{currentProvider}</span>
              </td>
              <td className="py-4 px-4 text-center bg-purple-50/30">
                <span className="font-semibold text-purple-900">{bestOfferProvider}</span>
              </td>
            </tr>

            {/* Nome Offerta */}
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="py-4 px-4 font-medium text-sm text-gray-700">Nome Offerta</td>
              <td className="py-4 px-4 text-center bg-gray-50/30">
                <span className="text-sm text-gray-700">{currentOfferType || 'Non specificato'}</span>
              </td>
              <td className="py-4 px-4 text-center bg-purple-50/30">
                <span className="text-sm font-medium text-purple-800">{bestOfferName}</span>
              </td>
            </tr>

            {/* Costo Mensile */}
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="py-4 px-4 font-medium text-sm text-gray-700">Costo Mensile</td>
              <td className="py-4 px-4 text-center bg-gray-50/30">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold text-gray-800">
                    {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(currentMonthly)}
                  </span>
                </div>
              </td>
              <td className="py-4 px-4 text-center bg-purple-50/30">
                <div className="flex items-center justify-center gap-2">
                  <TrendingDown className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(bestOfferMonthly)}
                  </span>
                </div>
              </td>
            </tr>

            {/* Costo Annuale */}
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="py-4 px-4 font-medium text-sm text-gray-700">Costo Annuale</td>
              <td className="py-4 px-4 text-center bg-gray-50/30">
                <span className="text-lg font-semibold text-gray-700">
                  {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(currentAnnual)}
                </span>
              </td>
              <td className="py-4 px-4 text-center bg-purple-50/30">
                <span className="text-lg font-semibold text-green-600">
                  {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(bestOfferAnnual)}
                </span>
              </td>
            </tr>

            {/* Risparmio */}
            <tr className="bg-green-50 border-t-2 border-green-200">
              <td className="py-4 px-4 font-bold text-sm text-green-900">Risparmio Annuo</td>
              <td className="py-4 px-4 text-center">
                <span className="text-sm text-gray-500">-</span>
              </td>
              <td className="py-4 px-4 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-green-600">
                    {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(savingAnnual)}
                  </span>
                  <span className="text-sm font-semibold text-green-700 mt-1">
                    (-{savingPercentage}%)
                  </span>
                </div>
              </td>
            </tr>

            {/* Consumo */}
            <tr className="hover:bg-gray-50/50 transition-colors border-t border-gray-200">
              <td className="py-4 px-4 font-medium text-sm text-gray-700">Consumo Annuo</td>
              <td colSpan={2} className="py-4 px-4 text-center">
                <span className="text-base font-semibold text-gray-800">
                  {consumption.toLocaleString('it-IT')} {billType === 'gas' ? 'Smc' : 'kWh'}
                </span>
              </td>
            </tr>

            {/* Promozione */}
            {hasPromo && (
              <tr className="bg-orange-50 border-t-2 border-orange-200">
                <td className="py-4 px-4 font-medium text-sm text-orange-900 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Promozione Attiva
                </td>
                <td className="py-4 px-4 text-center">
                  <X className="h-5 w-5 text-gray-400 mx-auto" />
                </td>
                <td className="py-4 px-4 text-center bg-orange-100/50">
                  <div className="flex items-start gap-2 justify-center">
                    <Check className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium text-orange-800 text-left">{bestOfferPromo}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Card */}
      <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-lg">
        <div className="flex items-start gap-3">
          <TrendingDown className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-green-900 mb-1">Riepilogo Vantaggi</h4>
            <p className="text-sm text-green-800">
              Passando a <span className="font-semibold">{bestOfferName}</span> risparmi{' '}
              <span className="font-bold text-green-600">{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(savingAnnual)}</span>{' '}
              all'anno rispetto alla tua offerta attuale.
              {hasPromo && (
                <span className="block mt-2 text-xs font-semibold text-orange-700 bg-orange-100 inline-block px-2 py-1 rounded">
                  ⚡ Approfitta della promozione a tempo prima che scada!
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
