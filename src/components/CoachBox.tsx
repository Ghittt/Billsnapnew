import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EnergyCoachBoxProps {
    uploadId: string;
    consumo_annuo_kwh: number;
    spesa_mensile_corrente: number;
    spesa_annua_corrente: number;
    fornitore_attuale: string;
    tipo_offerta_attuale?: string;
}

const EnergyCoachBox: React.FC<EnergyCoachBoxProps> = ({
    uploadId,
    consumo_annuo_kwh,
    spesa_mensile_corrente,
    spesa_annua_corrente,
    fornitore_attuale,
    tipo_offerta_attuale
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<string | null>(null);

    const fetchAnalysis = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

            console.log('EnergyCoach: Fetching analysis for uploadId:', uploadId);

            const response = await fetch(
                'https://jxluygtonamgadqgzgyh.supabase.co/functions/v1/energy-coach',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        upload_id: uploadId,
                        consumo_annuo_kwh,
                        spesa_mensile_corrente,
                        spesa_annua_corrente,
                        fornitore_attuale,
                        tipo_offerta_attuale: tipo_offerta_attuale || 'non specificato'
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Errore ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('EnergyCoach: Response received', data);

            if (data.ok && data.analysis) {
                setAnalysis(data.analysis);
            } else {
                throw new Error(data.error || 'Risposta non valida dal server');
            }
        } catch (err) {
            console.error('Energy Coach error:', err);
            setError(err instanceof Error ? err.message : 'Errore sconosciuto');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (uploadId && consumo_annuo_kwh && spesa_mensile_corrente) {
            fetchAnalysis();
        }
    }, [uploadId]);

    if (loading) {
        return (
            <Card className='border-2 border-purple-500/30 bg-gradient-to-br from-purple-50/50 to-blue-50/50'>
                <CardContent className='p-8'>
                    <div className='flex items-center gap-3 mb-4'>
                        <Sparkles className='h-6 w-6 text-purple-600' />
                        <h3 className='text-2xl font-bold'>Analisi Intelligente</h3>
                    </div>
                    <div className='space-y-3'>
                        <div className='h-4 bg-gray-200 rounded animate-pulse w-3/4'></div>
                        <div className='h-4 bg-gray-200 rounded animate-pulse w-full'></div>
                        <div className='h-4 bg-gray-200 rounded animate-pulse w-5/6'></div>
                        <div className='h-4 bg-gray-200 rounded animate-pulse w-2/3'></div>
                    </div>
                    <div className='flex items-center gap-2 mt-6 text-sm text-muted-foreground'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        <span>Generazione analisi personalizzata...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className='border-2 border-red-500/30 bg-red-50/50'>
                <CardContent className='p-8 text-center space-y-4'>
                    <AlertCircle className='h-12 w-12 mx-auto text-red-600' />
                    <div>
                        <h3 className='text-xl font-bold mb-2'>Errore nel caricamento</h3>
                        <p className='text-sm text-muted-foreground mb-4'>{error}</p>
                        <Button onClick={fetchAnalysis} variant='outline' size='sm'>
                            Riprova
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!analysis) {
        return null;
    }

    return (
        <Card className='border-2 border-purple-500/30 bg-gradient-to-br from-purple-50/50 to-blue-50/50'>
            <CardContent className='p-8'>
                <div className='flex items-center gap-3 mb-6'>
                    <Sparkles className='h-6 w-6 text-purple-600' />
                    <h3 className='text-2xl font-bold'>Consiglio Personalizzato</h3>
                </div>

                <div className='prose prose-sm max-w-none'>
                    <div className='whitespace-pre-wrap text-gray-700 leading-relaxed'>
                        {analysis}
                    </div>
                </div>

                <div className='mt-6 pt-4 border-t border-purple-200'>
                    <p className='text-xs text-muted-foreground flex items-center gap-2'>
                        <Sparkles className='h-3 w-3' />
                        SnapAI™
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default EnergyCoachBox;