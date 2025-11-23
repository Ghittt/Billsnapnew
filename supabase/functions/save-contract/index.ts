import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { upload_id, user_id } = await req.json();

    if (!upload_id || !user_id) {
      throw new Error('Missing upload_id or user_id');
    }

    console.log('Saving contract from upload:', upload_id);

    // Fetch OCR results
    const { data: ocrData, error: ocrError } = await supabaseClient
      .from('ocr_results')
      .select('*')
      .eq('upload_id', upload_id)
      .single();

    if (ocrError || !ocrData) {
      throw new Error('No OCR data found');
    }

    // Fetch upload data to get bill type
    const { data: uploadData } = await supabaseClient
      .from('uploads')
      .select('tipo_bolletta')
      .eq('id', upload_id)
      .single();

    const billType = uploadData?.tipo_bolletta || 'luce';
    const commodity = billType === 'gas' ? 'gas' : 'power';

    // Check if contract already exists for this upload
    const { data: existingContract } = await supabaseClient
      .from('contracts_history')
      .select('id')
      .eq('upload_id', upload_id)
      .maybeSingle();

    if (existingContract) {
      console.log('Contract already exists for this upload');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Contract already exists',
          contract_id: existingContract.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deactivate previous current contracts for this user and commodity
    await supabaseClient
      .from('contracts_history')
      .update({ is_current: false, end_date: new Date().toISOString().split('T')[0] })
      .eq('user_id', user_id)
      .eq('commodity', commodity)
      .eq('is_current', true);

    // Determine contract dates
    const startDate = ocrData.billing_period_start || new Date().toISOString().split('T')[0];
    
    // Try to estimate contract end date (typically 12 months from start)
    let endDate = null;
    if (ocrData.billing_period_start) {
      const start = new Date(ocrData.billing_period_start);
      start.setFullYear(start.getFullYear() + 1);
      endDate = start.toISOString().split('T')[0];
    }

    // Create new contract
    const contractData: any = {
      user_id,
      upload_id,
      provider: ocrData.provider || 'Provider sconosciuto',
      commodity,
      start_date: startDate,
      end_date: endDate,
      is_current: true,
      annual_cost_eur: ocrData.costo_annuo_totale || ocrData.total_cost_eur,
      annual_kwh: commodity === 'power' ? ocrData.annual_kwh : null,
      annual_smc: commodity === 'gas' ? ocrData.consumo_annuo_smc : null,
    };

    const { data: newContract, error: insertError } = await supabaseClient
      .from('contracts_history')
      .insert(contractData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting contract:', insertError);
      throw insertError;
    }

    console.log('Successfully created contract:', newContract.id);

    // Create notification for new contract
    await supabaseClient
      .from('notifications')
      .insert({
        user_id,
        type: 'contract_saved',
        title: 'Contratto Salvato',
        message: `Il tuo contratto con ${ocrData.provider || 'il fornitore'} è stato salvato automaticamente.`,
        data: { contract_id: newContract.id, provider: ocrData.provider }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        contract: newContract 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-contract:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
