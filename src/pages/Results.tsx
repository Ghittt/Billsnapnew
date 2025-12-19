import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import '@/types/analytics';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IntelligentAnalysis } from '@/components/results/IntelligentAnalysis';
import { MethodSection } from '@/components/results/MethodSection';
import { ReferralCard } from '@/components/results/ReferralCard';
import RedirectPopup from '@/components/results/RedirectPopup';
import { getOfferUrl } from '@/utils/offerUrls';
import { fixOfferUrlCommodity } from '@/utils/offerUrlFixer';

// DEBUG MODE: Enable via URL ?debug=1 or env VITE_DEBUG=true

// Data Origin Badge Component
const DataOriginBadge = ({ source }: { source: "BILL" | "ESTIMATED" | "CALCULATED" | "MISSING" }) => {
  const labels = {
    BILL: { text: "Da bolletta", variant: "secondary" as const },
    ESTIMATED: { text: "Stimato", variant: "outline" as const },
    CALCULATED: { text: "Calcolato", variant: "default" as const },
    MISSING: { text: "In verifica", variant: "destructive" as const }
  };
  const { text, variant } = labels[source];
  return <Badge variant={variant} className="ml-2 text-xs">{text}</Badge>;
};
const DEBUG = (import.meta.env.VITE_DEBUG === "true") || (new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get("debug") === "1");

// Simple hash function for comparison
const simpleHash = (str) => {
  if (!str) return "null";
  const len = str.length;
  const first80 = str.substring(0, 80);
  const last80 = str.substring(Math.max(0, len - 80));
  return `len:${len}|f:${first80}|l:${last80}`;
};

interface Offer {
  id: string;
  provider: string;
  plan_name: string;
  price_kwh: number | null;
  unit_price_eur_smc: number | null;
  fixed_fee_eur_mo: number;
  simulated_cost: number;
  redirect_url: string | null;
  commodity: string;
  promo_text?: string | null;
}

const ResultsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uploadId = searchParams.get('uploadId');
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [ocrData, setOcrData] = useState<any>(null);
  const [bestOffer, setBestOffer] = useState<Offer | null>(null);
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [currentCost, setCurrentCost] = useState<number>(0);
  const [consumption, setConsumption] = useState<number>(0);
  const [billType, setBillType] = useState<'luce' | 'gas' | 'combo'>('luce');
  const [analyzerResult, setAnalyzerResult] = useState<any>(null);
  const [hasGoodOffer, setHasGoodOffer] = useState(false);
  const [isDataInVerifica, setIsDataInVerifica] = useState(false);

  // DEBUG STATE
  const [debugData, setDebugData] = useState<any>({
    analysisId: null,
    timestamp: null,
    commodity: null,
    decisionAction: null,
    decisionReason: null,
    savingsAnnual: null,
    offerCountTotal: null,
    offerCountFiltered: null,
    currentProvider: null,
    bestOfferProvider: null,
    payloadHash: null,
    responseHash: null,
    rawResponse: null,
    apiStatus: null,
    aiCalled: false
  });

  // Manual Input State
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualConsumption, setManualConsumption] = useState('');
  const [manualCost, setManualCost] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Redirect Popup State
  const [showRedirectPopup, setShowRedirectPopup] = useState(false);
  const [redirectData, setRedirectData] = useState<{provider: string; offerName: string; url: string} | null>(null);

  useEffect(() => {
    if (!uploadId) {
      toast({
        title: 'Errore',
        description: 'ID upload mancante',
        variant: 'destructive'
      });
      navigate('/upload');
      return;
    }
    fetchRealResults();
  }, [uploadId]);

  const fetchRealResults = async () => {
    try {
      setIsLoading(true);

      const { data: ocrResult, error: ocrError } = await supabase
        .from('ocr_results')
        .select('*')
        .eq('upload_id', uploadId)
        .maybeSingle();

      if (ocrError || !ocrResult) {
        console.error('OCR fetch error:', ocrError);
        throw new Error('Impossibile recuperare i dati della bolletta. Riprova caricando un file più nitido.');
      }

      setOcrData(ocrResult);

      const { data: uploadData } = await supabase
        .from('uploads')
        .select('*')
        .eq('id', uploadId)
        .maybeSingle();

      let tipo = (uploadData?.tipo_bolletta || 'luce') as 'luce' | 'gas' | 'combo';
      
      if (!uploadData?.tipo_bolletta && ocrResult) {
        if (ocrResult.gas_smc > 0 || ocrResult.consumo_annuo_smc > 0) {
          tipo = 'gas';
        } else if (ocrResult.annual_kwh > 0) {
          tipo = 'luce';
        }
      }
      
      console.log('[🔍 BILLTYPE] tipo from OCR:', tipo);
      console.log('[🔍 BILLTYPE] ocrResult.raw_json.tipo_fornitura:', ocrResult?.raw_json?.tipo_fornitura);
      setBillType(tipo);


      // UI DATA CERTIFICATION: Use ONLY analyzerResult data
      // No local calculations - Decision Engine is single source of truth
      // Consumption and cost will be set from bill-analyzer response (L285+)

      // Fetch real offers from database
      // Fetch ALL offers from energy_offers (single source of truth)
      const { data: allOffersData, error: offersError } = await supabase
        .from('energy_offers')
        .select('*');
      
      if (DEBUG) {
        console.log('[DEBUG] energy_offers fetched:', allOffersData?.length, 'error:', offersError);
        if (allOffersData && allOffersData.length > 0) {
          console.log('[DEBUG] First offer:', JSON.stringify(allOffersData[0]));
        }
      }

      // Case-insensitive commodity filtering
      const offerteLuce = (allOffersData || []).filter(o => {
        const comm = (o.commodity || o.tipo_fornitura || '').toLowerCase();
        return comm === 'luce' || comm === 'electricity';
      });
      if (DEBUG) console.log('[DEBUG] Filtered LUCE offers:', offerteLuce.length);
      const offerteGas = (allOffersData || []).filter(o => {
        const comm = (o.commodity || o.tipo_fornitura || '').toLowerCase();
        return comm === 'gas';
      });
      if (DEBUG) console.log('[DEBUG] Filtered GAS offers:', offerteGas.length);

      // Call bill-analyzer to get proper filtered offers
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      // DEBUG: Log the payload before sending
        const billPayload = {
          ocr: ocrResult.raw_json || {
            tipo_fornitura: tipo,
            provider: ocrResult.provider,
            bolletta_luce: tipo === 'luce' ? {
              presente: true,
              consumo_annuo_kwh: consumo,
              totale_periodo_euro: costo,
              periodo: { mesi: 12 }
            } : { presente: false },
            bolletta_gas: tipo === 'gas' ? {
              presente: true,
              consumo_annuo_smc: consumo,
              totale_periodo_euro: costo,
              periodo: { mesi: 12 }
            } : { presente: false }
          },
          profilo_utente: { eta: 30, isee_range: 'medio' },
          offerte_luce: offerteLuce,
          offerte_gas: offerteGas,
          parametri_business: { soglia_risparmio_significativo_mese: 5 }
        };
        
        const payloadString = JSON.stringify(billPayload);
        const payloadHash = simpleHash(payloadString);
        
        if (DEBUG) {
          console.log("[DEBUG] INPUT bill tipo:", tipo);
          console.log("[DEBUG] INPUT consumo:", consumo, "costo:", costo);
          console.log("[DEBUG] INPUT offers LUCE count:", offerteLuce.length);
          console.log("[DEBUG] INPUT offers GAS count:", offerteGas.length);
          console.log("[DEBUG] Payload hash:", payloadHash);
        }
        
        const analyzerResponse = await fetch(
        'https://jxluygtonamgadqgzgyh.supabase.co/functions/v1/bill-analyzer',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: payloadString
        }
      );

      if (analyzerResponse.ok) {
        // DEBUG: Log response details
        const responseStatus = analyzerResponse.status;
        const analyzerData = await analyzerResponse.json();
        const responseString = JSON.stringify(analyzerData);
        const responseHash = simpleHash(responseString);
        
        if (DEBUG) {
          console.log("[DEBUG] Response status:", responseStatus);
          console.log("[DEBUG] Response hash:", responseHash);
          console.log("[DEBUG] Parsed response:", analyzerData);
          console.log("[DEBUG] commodity_final:", analyzerData.commodity_final);
          console.log("[DEBUG] decision.action:", analyzerData.decision?.action || analyzerData.luce?.decision?.action || analyzerData.gas?.decision?.action);
        }
        
        // Update debug state
        const analysisTimestamp = new Date().toISOString();
        setDebugData(prev => ({
          ...prev,
          analysisId: uploadId + "_" + Date.now(),
          timestamp: analysisTimestamp,
          commodity: analyzerData.commodity_final,
          apiStatus: responseStatus,
          payloadHash,
          responseHash,
          rawResponse: analyzerData,
          offerCountTotal: (offerteLuce?.length || 0) + (offerteGas?.length || 0)
        }));
        setAnalyzerResult(analyzerData);
        console.log('[Results] BillSnap Core response:', analyzerData);

        // FAIL-CLOSED: Handle IN_VERIFICA status
        if (analyzerData.data_status === 'IN_VERIFICA' || 
            (analyzerData.decision?.action === 'INSUFFICIENT_DATA' && !analyzerData.current)) {
          console.log('[Results] Data gate failed - showing IN_VERIFICA state');
          setIsDataInVerifica(true);
          setIsLoading(false);
          return;
        }
        
        // New BillSnap Core structure
        // For DUAL: { commodity_final: "DUAL", luce: {...}, gas: {...} }
        // For single: { commodity_final: "LUCE"|"GAS", current: {...}, best_offer: {...}, decision: {...}, savings: {...}, expert_copy: {...} }
        
        let targetData = analyzerData;
        
        // Handle DUAL case
        if (analyzerData.commodity_final === "DUAL") {
          targetData = tipo === 'gas' ? analyzerData.gas : analyzerData.luce;
        }
        
        // Set current cost from Core response
        if (targetData?.current?.annual_eur) {
          console.log('[🔍 COST] targetData.current:', targetData?.current);
          console.log('[🔍 COST] annual_eur:', targetData?.current?.annual_eur);
          setCurrentCost(Number(targetData.current.annual_eur));
        }
        
        // Handle decision.action with switch statement
        const action = targetData?.decision?.action;
        const copy = targetData?.expert_copy;
        
        // Extract consumption inline to avoid async state timing issues
        const extractedConsumption = targetData?.current?.consumption_annual?.kwh 
          || targetData?.current?.consumption_annual?.smc 
          || 0;
        
        console.log('[🔍 BILLTYPE-2] Current billType state:', billType);
        console.log('[🔍 BILLTYPE-2] Will use parameter:', billType === 'gas' ? 'consumo_annuo_smc' : 'consumo_annuo_kwh');
        console.log('[🔍 CONSUMPTION] Extracted:', extractedConsumption, 'from', targetData?.current?.consumption_annual);
        setConsumption(extractedConsumption);  // Update state for UI display
        
        // Extract cost inline (same pattern as consumption)
        const extractedCost = targetData?.current?.annual_eur 
          || (targetData?.current?.monthly_eur ? Number(targetData.current.monthly_eur) * 12 : 0)
          || 0;
        console.log('[🔍 COST] Extracted cost:', extractedCost, 'from annual_eur:', targetData?.current?.annual_eur);
        
        // Extract fasce orarie from OCR data
        const f1 = ocrResult?.f1_kwh || ocrResult?.raw_json?.bolletta_luce?.consumi_fasce?.f1 || 0;
        const f2 = ocrResult?.f2_kwh || ocrResult?.raw_json?.bolletta_luce?.consumi_fasce?.f2 || 0;
        const f3 = ocrResult?.f3_kwh || ocrResult?.raw_json?.bolletta_luce?.consumi_fasce?.f3 || 0;
        const potenzaKw = ocrResult?.potenza_kw || ocrResult?.raw_json?.bolletta_luce?.potenza_kw || 0;
        console.log('[🔍 FASCE] Extracted:', {f1, f2, f3, potenzaKw});
        
        switch (action) {
          case "SWITCH": {
            console.log('[🔍 AI-DEBUG-1] SWITCH case triggered');
            console.log('[🔍 AI-DEBUG-2] uploadId:', uploadId);
            console.log('[🔍 AI-DEBUG-3] consumption:', consumption);
            // DEBUG: Update state
            setDebugData(prev => ({
              ...prev,
              decisionAction: action,
              decisionReason: targetData?.decision?.reason,
              savingsAnnual: targetData?.savings?.annual_eur,
              bestOfferProvider: targetData?.best_offer?.provider,
              offerCountFiltered: 1
            }));
            // renderSwitch() - Show offer cards and recommendation
            console.log('[Results] Decision: SWITCH');
            const best = targetData.best_offer;
            const savings = targetData.savings;
            
            if (best) {
              const ranked = [{
                id: best.offer_name || 'best-1',
                provider: best.provider,
                plan_name: best.offer_name,
                simulated_cost: best.annual_eur || 0,
                tipo_prezzo: best.price_type?.toLowerCase() || 'variabile',
                risparmio_mensile: savings?.monthly_eur || 0,
                link: best.link
              }];
              
              setBestOffer(ranked[0]);
              setAllOffers(ranked);
              
              // Call energy-coach API for real AI analysis
              if (uploadId) {  // Removed consumption check - allow 0
              console.log('[🔍 AI-DEBUG-4] Condition passed - calling AI');
              console.log('[🔍 AI-DEBUG-4.5] Using extractedConsumption:', extractedConsumption);
              setIsAiLoading(true);
              console.log('[🔍 AI-DEBUG-5] isAiLoading set to true');  // Set loading BEFORE async call
                fetchAiAnalysis(
                  uploadId,
                  extractedConsumption,  // Use extracted value, not state
                  currentMonthly,
                  extractedCost,  // Use extracted value, not state
                  ocrData?.provider || 'non specificato',
                  ocrData?.tariff_hint,
                  f1, f2, f3,
                  potenzaKw, // ADDED: potenza oraria from OCR
                  0, // price per kWh
                  ranked[0], // best offer
                  null
                );
              }
            }
            break;
          }
          
          case "STAY":
          case "INSUFFICIENT_DATA": {
            console.log('[🔍 AI-DEBUG-1-STAY] STAY/INSUFFICIENT case triggered');
            console.log('[🔍 AI-DEBUG-2-STAY] uploadId:', uploadId);
            // DEBUG: Update state
            setDebugData(prev => ({
              ...prev,
              decisionAction: action,
              decisionReason: targetData?.decision?.reason,
              savingsAnnual: targetData?.savings?.annual_eur,
              offerCountFiltered: 0
            }));
            setHasGoodOffer(true);
            
            // ALSO call AI for STAY case - personalized analysis
            if (uploadId) {
              console.log('[🔍 AI-DEBUG-3-STAY] Calling AI for STAY case');
              console.log('[🔍 AI-DEBUG-3.5-STAY] Using extractedConsumption:', extractedConsumption);
              setIsAiLoading(true);
              fetchAiAnalysis(
                uploadId,
                extractedConsumption,  // Use extracted value, not state
                currentMonthly,
                extractedCost,  // Use extracted value, not state
                ocrData?.provider || 'non specificato',
                ocrData?.tariff_hint,
                f1, f2, f3,
                potenzaKw, // ADDED: potenza oraria from OCR
                0,
                null,  // No best offer for STAY
                null
              );
            } else {
              // Fallback if no uploadId
              const stayText = copy?.headline ? 
                `#### ${copy.headline}\n\n${(copy.summary_3_lines || []).join('\n\n')}` :
                `#### ${targetData?.decision?.reason || 'La tua offerta è competitiva'}`;
              setAiAnalysis(stayText);
            }
            setIsLoading(false);
            return; // Exit early, no offers to show
          }
          
          case "ASK_CLARIFICATION": {
            // renderQuestion() - Ask user for more info
            console.log('[Results] Decision: ASK_CLARIFICATION - ' + targetData?.decision?.reason);
            setHasGoodOffer(false);
            const questionText = "#### Abbiamo bisogno di più informazioni\n\n" + (targetData?.decision?.reason || "Per favore carica una bolletta più completa.");
            setAiAnalysis(questionText);
            setIsLoading(false);
            return; // Exit early
          }
          
          default: {
            console.warn('[Results] Unknown action:', action);
            setAiAnalysis("#### Analisi non disponibile\n\nNon siamo riusciti a elaborare la tua bolletta. Riprova.");
          }
        }
      } else {
        console.error('[Results] Bill-analyzer request failed');
        throw new Error('Nessuna offerta disponibile per i tuoi parametri. Riprova più tardi.');
      }

    } catch (error) {
      console.error('Error fetching results:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore nel caricamento dei risultati',
        variant: 'destructive'
      });
      setTimeout(() => navigate('/upload'), 2000);
    } finally {
      if (!showManualInput) {
        setIsLoading(false);
      }
    }
  };

  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<boolean>(false);

  const fetchAiAnalysis = async (
    uId: string, 
    consumo: number, 
    mensile: number, 
    annuo: number, 
    provider: string, 
    offerta: string | undefined,
    f1: number,
    f2: number,
    f3: number,
    potenza: number, // ADDED
    priceKwh: number,
    offertaFissa?: any,
    offertaVariabile?: any
  ) => {
    try {
      console.log('[🔍 AI-DEBUG-6] fetchAiAnalysis CALLED with uploadId:', uId);
      setIsAiLoading(true);
      setAiError(false);
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      console.log('[🔍 AI-DEBUG-6.5] About to call energy-coach with body:', {
        uploadId: uId,
        consumo_annuo_kwh: billType === 'gas' ? undefined : consumo,
        consumo_annuo_smc: billType === 'gas' ? consumo : undefined,
      });
      
      const response = await fetch(
        'https://jxluygtonamgadqgzgyh.supabase.co/functions/v1/energy-coach',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            uploadId: uId,
            // Pass correct parameter based on bill type
            ...(billType === 'gas' 
              ? { consumo_annuo_smc: consumo }
              : { consumo_annuo_kwh: consumo }),
            spesa_mensile_corrente: mensile,
            spesa_annua_corrente: annuo,
            fornitore_attuale: provider,
            tipo_offerta_attuale: offerta || 'non specificato',
            f1_consumption: f1,
            f2_consumption: f2,
            f3_consumption: f3,
            potenza_kw: potenza, // ADDED
            current_price_kwh: priceKwh,
            offerta_fissa: offertaFissa ? {
                nome_offerta: offertaFissa.nome || offertaFissa.plan_name,
                provider: offertaFissa.fornitore || offertaFissa.provider,
                costo_annuo: (offertaFissa.costo_mensile ? offertaFissa.costo_mensile * 12 : offertaFissa.simulated_cost),
                prezzo_energia_euro_kwh: offertaFissa.prezzo_energia_euro_kwh || offertaFissa.price_kwh || null,
                prezzo_energia_euro_smc: offertaFissa.prezzo_energia_euro_smc || offertaFissa.price_smc || null,
                quota_fissa_mensile: offertaFissa.quota_fissa_mensile || offertaFissa.fixed_fee_monthly || null,
                tipo_prezzo: offertaFissa.tipo_prezzo || offertaFissa.price_type || 'fisso'
            } : null,
            offerta_variabile: offertaVariabile ? {
                nome_offerta: offertaVariabile.nome || offertaVariabile.plan_name,
                provider: offertaVariabile.fornitore || offertaVariabile.provider,
                costo_annuo: (offertaVariabile.costo_mensile ? offertaVariabile.costo_mensile * 12 : offertaVariabile.simulated_cost),
                prezzo_energia_euro_kwh: offertaVariabile.prezzo_energia_euro_kwh || offertaVariabile.price_kwh || null,
                prezzo_energia_euro_smc: offertaVariabile.prezzo_energia_euro_smc || offertaVariabile.price_smc || null,
                quota_fissa_mensile: offertaVariabile.quota_fissa_mensile || offertaVariabile.fixed_fee_monthly || null,
                tipo_prezzo: offertaVariabile.tipo_prezzo || offertaVariabile.price_type || 'variabile'
            } : null
          })
        }
      );

      if (!response.ok) throw new Error('AI Error');
      
      const data = await response.json();
      console.log('[🔍 AI-DEBUG-7] API Response:', {ok: data.ok, hasAnalysis: !!data.analysis});
      if (data.ok && data.analysis) {
        console.log('[🔍 AI-DEBUG-8] Setting aiAnalysis, length:', data.analysis?.length);
        setAiAnalysis(data.analysis);
        console.log('[🔍 AI-DEBUG-9] aiAnalysis state updated');
      } else {
        throw new Error('Invalid AI response');
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
      setAiError(true);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    try {
      setIsUpdating(true);
      const kwh = parseFloat(manualConsumption);
      const eur = parseFloat(manualCost);

      if (isNaN(kwh) || kwh <= 0 || isNaN(eur) || eur <= 0) {
        toast({
          title: 'Dati non validi',
          description: 'Inserisci valori numerici positivi',
          variant: 'destructive'
        });
        return;
      }

      const updateData: any = {
        total_cost_eur: eur,
        quality_score: 1.0,
        tariff_hint: 'manual_fallback'
      };

      if (billType === 'gas') {
        updateData.gas_smc = kwh;
        updateData.consumo_annuo_smc = kwh;
      } else {
        updateData.annual_kwh = kwh;
      }

      const { error: updateError } = await supabase
        .from('ocr_results')
        .update(updateData)
        .eq('upload_id', uploadId);

      if (updateError) throw updateError;

      const { error: compareError } = await supabase.functions.invoke('compare-offers', {
        body: { uploadId }
      });

      if (compareError) throw compareError;

      setShowManualInput(false);
      setIsLoading(true);
      fetchRealResults();

    } catch (error) {
      console.error('Manual update failed:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare i dati. Riprova.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleActivateOffer = async (offer: Offer) => {
    // Use specific offer URL if available, otherwise fallback to provider homepage
    // ALWAYS use homepage - database URLs are often broken
    const providerUrl = false 
      ? offer.redirect_url 
      : getOfferUrl(offer.provider, offer.plan_name);
    
    const annualSaving = currentCost - offer.simulated_cost;

    await supabase.from('leads').insert({
      upload_id: uploadId || crypto.randomUUID(),
      provider: offer.provider,
      offer_id: offer.id,
      redirect_url: providerUrl,
      offer_annual_cost_eur: offer.simulated_cost,
      annual_saving_eur: annualSaving,
      current_annual_cost_eur: currentCost,
    });

    if (typeof gtag !== 'undefined') {
      gtag('event', 'offer_activated', {
        event_category: 'conversion',
        provider: offer.provider,
        annual_saving: annualSaving
      });
    }
    
    // Show popup with instructions instead of direct redirect
    setRedirectData({
      provider: offer.provider,
      offerName: offer.plan_name,
      url: providerUrl
    });
    setShowRedirectPopup(true);
  };

  const fmt = (n: number) => new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n);

  const annualSaving = bestOffer ? currentCost - bestOffer.simulated_cost : 0;
  const monthlySaving = annualSaving / 12;
  const currentMonthly = currentCost / 12;
  const newMonthly = bestOffer ? bestOffer.simulated_cost / 12 : currentMonthly;
  const hasSavings = monthlySaving > 0;
  
  // Generate offer URL using utility function
  const bestOfferUrl = bestOffer 
    ? (bestOffer.redirect_url || getOfferUrl(bestOffer.provider, bestOffer.plan_name))
    : null;

  if (isLoading) {
    return (
      <div className='min-h-screen bg-background'>
        <Header />
        <div className='container mx-auto px-4 py-12 flex items-center justify-center'>
          <div className='text-center space-y-4'>
            <Loader2 className='h-12 w-12 animate-spin mx-auto text-primary' />
            <p className='text-muted-foreground'>Caricamento risultati...</p>
          </div>
        </div>
      </div>
    );
  }

  // FAIL-CLOSED: Show "Dati in verifica" when data is unreliable
  if (isDataInVerifica) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" onClick={() => navigate("/upload")} className="gap-2 mb-6">
            <ArrowLeft className="h-4 w-4" /> Analizza un'altra bolletta
          </Button>
          <Card className="border-2 border-yellow-400 bg-yellow-50">
            <CardContent className="p-8 text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-yellow-600" />
              <h2 className="text-2xl font-bold text-yellow-700">Dati in verifica</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Non siamo riusciti a estrarre tutti i dati necessari dalla bolletta.
                Riprova con un'immagine più nitida o inserisci i dati manualmente.
              </p>
              <Button onClick={() => setShowManualInput(true)} className="mt-4">
                Inserisci dati manualmente
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background'>
      <Header />
      <main className='container mx-auto px-4 py-8 max-w-4xl'>
        <Button
          variant='ghost'
          onClick={() => navigate('/upload')}
          className='gap-2 mb-6'
        >
          <ArrowLeft className='h-4 w-4' />
          Analizza un'altra bolletta
        </Button>

        <div className='text-center space-y-4 py-4 mb-8'>
          <h1 className='text-4xl md:text-5xl font-bold'>La tua analisi personalizzata</h1>
          <p className='text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto'>
            Dati reali estratti dalla tua bolletta e confrontati con le migliori offerte disponibili oggi.
          </p>
        </div>

        <div className='space-y-12'>
          <div className={hasGoodOffer ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}>
            <Card className='border-2 shadow-sm'>
              <CardContent className='p-6 md:p-8 text-center space-y-4'>
                <p className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>SPENDI ORA</p>
                
                <div className='py-2'>
                  <span className='text-5xl font-bold'>{fmt(currentMonthly)}</span>
                  <p className='text-sm text-muted-foreground mt-1'>al mese</p>
                </div>

                <div className='border-t pt-4 space-y-2 text-sm text-muted-foreground'>
                  <p>
                    {currentCost > 0 
                      ? `≈ €${currentCost.toLocaleString("it-IT")} all'anno` 
                      : "Dato in verifica"}
                    <DataOriginBadge source="CALCULATED" />
                  </p>
                  <p>
                    Consumo annuo: {consumption > 0 
                      ? `${consumption.toLocaleString("it-IT")} ${billType === "gas" ? "Smc" : "kWh"}` 
                      : "Dato in verifica"}
                    <DataOriginBadge source={analyzerResult?.current?.consumption_was_estimated ? "ESTIMATED" : "BILL"} />
                  </p>
                  <p>Fornitore attuale: <span className='font-medium text-foreground'>{ocrData?.provider || 'N/A'}</span></p>
                  {ocrData?.tariff_hint && (
                    <p>Tipo offerta: {ocrData.tariff_hint}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {bestOffer && !hasGoodOffer && (
              <Card className='border-2 border-primary/40 shadow-md relative overflow-hidden'>
                <div className='absolute top-0 left-0 w-full h-1 bg-primary'></div>
                <CardContent className='p-6 md:p-8 text-center space-y-4'>
                  <p className='text-xs font-bold uppercase tracking-widest text-primary'>CON L'OFFERTA MIGLIORE PER TE</p>
                  
                  <div className='py-2'>
                    <span className='text-5xl font-bold text-primary'>{fmt(newMonthly)}</span>
                    <p className='text-sm text-muted-foreground mt-1'>al mese</p>
                  </div>

                  <div className='border-t pt-4 space-y-2 text-sm text-muted-foreground'>
                    <p>≈ {fmt(bestOffer.simulated_cost)} all'anno</p>
                    <p>Offerta consigliata: <span className='font-medium text-foreground'>{bestOffer.plan_name}</span></p>
                    <p>Fornitore: <span className='font-medium text-foreground'>{bestOffer.provider}</span></p>
                    
                    <div className='pt-2 mt-2 bg-green-50 text-green-700 p-2 rounded-md font-medium'>
                      Risparmio stimato: {fmt(monthlySaving)}/mese
                      <span className='block text-xs opacity-80'>(≈ {fmt(annualSaving)}/anno)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {hasGoodOffer && analyzerResult && (
            <Card className='border-2 border-green-500/40 shadow-md bg-green-50/50'>
              <CardContent className='p-8 text-center space-y-4'>
                <h2 className='text-3xl font-bold text-green-700'>
                  {(analyzerResult.decision?.action === "STAY" || 
                    analyzerResult.luce?.decision?.action === "STAY" || 
                    analyzerResult.gas?.decision?.action === "STAY") 
                    ? "🎉 Resta dove sei" 
                    : (analyzerResult.decision?.action === "INSUFFICIENT_DATA"
                    ? "⚠️ Dati insufficienti" 
                    : "❓ Servono più informazioni")}
                </h2>
                <p className='text-lg text-green-900'>
                  {analyzerResult.decision?.reason || 
                   analyzerResult.luce?.decision?.reason || 
                   analyzerResult.gas?.decision?.reason ||
                   analyzerResult.expert_copy?.headline ||
                   analyzerResult.luce?.expert_copy?.headline ||
                   analyzerResult.gas?.expert_copy?.headline ||
                   "La tua offerta attuale è già competitiva."}
                </p>
                <p className='text-muted-foreground'>
                  {analyzerResult.expert_copy?.summary_3_lines?.[0] ||
                   analyzerResult.luce?.expert_copy?.summary_3_lines?.[0] ||
                   analyzerResult.gas?.expert_copy?.summary_3_lines?.[0] ||
                   "Non conviene cambiare fornitore in questo momento."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* DEBUG PANEL - Only visible when DEBUG=true */}
          {DEBUG && (
            <Card className='border-2 border-yellow-500 bg-yellow-50'>
              <CardContent className='p-4'>
                <h3 className='font-bold text-lg mb-2'>🔧 DEBUG PANEL</h3>
                <div className='grid grid-cols-2 gap-2 text-sm font-mono'>
                  <div>Analysis ID:</div><div>{debugData.analysisId || 'N/A'}</div>
                  <div>Timestamp:</div><div>{debugData.timestamp || 'N/A'}</div>
                  <div>Commodity:</div><div>{debugData.commodity || 'N/A'}</div>
                  <div>Decision:</div><div className='font-bold'>{debugData.decisionAction || analyzerResult?.decision?.action || analyzerResult?.luce?.decision?.action || analyzerResult?.gas?.decision?.action || 'N/A'}</div>
                  <div>Reason:</div><div>{debugData.decisionReason || analyzerResult?.decision?.reason?.substring(0, 100) || 'N/A'}</div>
                  <div>Savings Annual:</div><div>{debugData.savingsAnnual || analyzerResult?.savings?.annual_eur || analyzerResult?.luce?.savings?.annual_eur || analyzerResult?.gas?.savings?.annual_eur || 'N/A'}</div>
                  <div>Offers Total:</div><div>{debugData.offerCountTotal || 'N/A'}</div>
                  <div>API Status:</div><div>{debugData.apiStatus || 'N/A'}</div>
                  <div>Payload Hash:</div><div className='text-xs break-all'>{debugData.payloadHash || 'N/A'}</div>
                  <div>Response Hash:</div><div className='text-xs break-all'>{debugData.responseHash || 'N/A'}</div>
                  <div>Current Provider:</div><div>{ocrData?.provider || 'N/A'}</div>
                  <div>Best Offer:</div><div>{bestOffer?.provider || 'None'} - {bestOffer?.plan_name || 'N/A'}</div>
                </div>
                <details className='mt-4'>
                  <summary className='cursor-pointer font-bold'>Raw JSON Response</summary>
                  <pre className='text-xs bg-gray-100 p-2 mt-2 overflow-auto max-h-64'>
                    {JSON.stringify(debugData.rawResponse || analyzerResult, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          )}

          {bestOffer && !hasGoodOffer && (
            <p className='text-center text-muted-foreground text-sm italic'>
              Questa è l'offerta che oggi risulta più conveniente per il tuo profilo di consumo.
            </p>
          )}

          {bestOffer && !hasGoodOffer && (
            <div className="mt-8">
               <IntelligentAnalysis
                consumption={consumption}
                billType={billType}
                currentMonthly={currentMonthly}
                currentAnnual={currentCost}
                currentProvider={ocrData?.provider || 'provider attuale'}
                currentOfferType={ocrData?.tariff_hint}
                bestOfferName={bestOffer.plan_name}
                bestOfferProvider={bestOffer.provider}
                bestOfferMonthly={newMonthly}
                bestOfferAnnual={bestOffer.simulated_cost}
                savingMonthly={monthlySaving}
                savingAnnual={annualSaving}
                aiAnalysis={aiAnalysis}
                isLoading={isAiLoading}
                error={aiError}
                onActivate={() => handleActivateOffer(bestOffer)}
                bestOfferPromo={bestOffer.promo_text}
              />
              
              {/* Review CTA */}
              <div className="mt-8 bg-gradient-to-r from-purple-50 to-white px-6 py-8 rounded-2xl border border-purple-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="text-center md:text-left space-y-2">
                  <h3 className="font-bold text-xl text-primary">Ti piace BillSnap?</h3>
                  <p className="text-muted-foreground max-w-md">
                    Se ti abbiamo aiutato a risparmiare o a capire meglio la tua bolletta, lasciaci una recensione! 
                    Ci aiuta a crescere e migliorare.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/feedback')}
                  variant="outline" 
                  className="bg-white hover:bg-purple-50 border-purple-200 text-purple-700 font-medium px-8 py-6 h-auto text-lg hover:scale-105 transition-transform"
                >
                  Lascia una Recensione ⭐
                </Button>
              </div>
            </div>
          )}

          <ReferralCard savingAmount={annualSaving} />

          {allOffers.length > 0 && (
            <MethodSection
              offersCount={allOffers.length}
              providersCount={new Set(allOffers.map(o => o.provider)).size}
              providers={Array.from(new Set(allOffers.map(o => o.provider)))}
            />
          )}
        </div>
      </main>

      <Dialog open={showManualInput} onOpenChange={setShowManualInput}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dati mancanti</DialogTitle>
            <DialogDescription>
              Non siamo riusciti a trovare il consumo o il costo annuo nella tua bolletta (potrebbe essere una nuova fornitura).
              Inserisci i dati manualmente per continuare.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='consumption' className='text-right'>
                Consumo ({billType === 'gas' ? 'Smc' : 'kWh'})
              </Label>
              <Input
                id='consumption'
                type='number'
                value={manualConsumption}
                onChange={(e) => setManualConsumption(e.target.value)}
                className='col-span-3'
                placeholder='Es. 2700'
              />
            </div>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='cost' className='text-right'>
                Spesa Annua (€)
              </Label>
              <Input
                id='cost'
                type='number'
                value={manualCost}
                onChange={(e) => setManualCost(e.target.value)}
                className='col-span-3'
                placeholder='Es. 1200'
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleManualSubmit} disabled={isUpdating}>
              {isUpdating ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
              Salva e Calcola
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redirect Popup with Instructions */}
      <RedirectPopup
        isOpen={showRedirectPopup}
        provider={redirectData?.provider || ''}
        offerName={redirectData?.offerName || ''}
        providerUrl={redirectData?.url || ''}
        onClose={() => setShowRedirectPopup(false)}
      />
    </div>
  );
};

export default ResultsPage;
