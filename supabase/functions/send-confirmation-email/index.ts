import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, notifications_opt_in } = await req.json();

    console.log('Sending confirmation email to:', email);
    console.log('Notifications opt-in:', notifications_opt_in);

    // TODO: Implementare invio email con Resend/SendGrid
    // Per ora logghiamo solo
    
    const emailContent = notifications_opt_in
      ? `Grazie per esserti iscritto a BillSnap!
      
Ti avviseremo quando troveremo offerte migliori per te e ti terremo aggiornato sul gruppo acquisto.

Stessa energia, meno stress.
BillSnap pensa al resto.`
      : `Grazie per aver usato BillSnap!

I tuoi dati sono stati salvati correttamente.

Stessa energia, meno stress.
BillSnap pensa al resto.`;

    console.log('Email content:', emailContent);

    // Simula invio email (da sostituire con servizio email reale)
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email di conferma inviata (placeholder)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-confirmation-email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
