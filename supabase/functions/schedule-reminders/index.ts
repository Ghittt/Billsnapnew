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

    const { user_id, contract_id } = await req.json();

    if (!user_id) {
      throw new Error('Missing user_id');
    }

    console.log('Scheduling reminders for user:', user_id);

    // Fetch user's current contracts
    const { data: contracts, error: contractsError } = await supabaseClient
      .from('contracts_history')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_current', true);

    if (contractsError) {
      throw contractsError;
    }

    const reminders: any[] = [];

    for (const contract of contracts || []) {
      // Reminder 1: Contract renewal (90 days before end date)
      if (contract.end_date) {
        const endDate = new Date(contract.end_date);
        const reminderDate = new Date(endDate);
        reminderDate.setDate(reminderDate.getDate() - 90);

        if (reminderDate > new Date()) {
          reminders.push({
            user_id,
            title: 'Rinnovo Contratto in Arrivo',
            message: `Il tuo contratto con ${contract.provider} scadrà il ${endDate.toLocaleDateString('it-IT')}. È il momento ideale per confrontare le offerte e risparmiare!`,
            reminder_type: 'contract_renewal',
            scheduled_for: reminderDate.toISOString(),
            metadata: {
              contract_id: contract.id,
              provider: contract.provider,
              end_date: contract.end_date,
            }
          });
        }

        // Reminder 2: Contract expiration (30 days before)
        const urgentReminderDate = new Date(endDate);
        urgentReminderDate.setDate(urgentReminderDate.getDate() - 30);

        if (urgentReminderDate > new Date()) {
          reminders.push({
            user_id,
            title: 'Contratto in Scadenza - Azione Richiesta',
            message: `Mancano solo 30 giorni alla scadenza del contratto ${contract.provider}. Confronta le nuove offerte ora per evitare rinnovi automatici sfavorevoli.`,
            reminder_type: 'contract_expiration',
            scheduled_for: urgentReminderDate.toISOString(),
            metadata: {
              contract_id: contract.id,
              provider: contract.provider,
              end_date: contract.end_date,
            }
          });
        }
      }

      // Reminder 3: Annual bill review
      const startDate = new Date(contract.start_date);
      const reviewDate = new Date(startDate);
      reviewDate.setFullYear(reviewDate.getFullYear() + 1);
      reviewDate.setMonth(reviewDate.getMonth() - 1); // 1 mese prima dell'anniversario

      if (reviewDate > new Date()) {
        reminders.push({
          user_id,
          title: 'Revisione Annuale Consumi',
          message: `È passato quasi un anno dal tuo contratto con ${contract.provider}. Verifica i tuoi consumi annuali e confronta le tariffe attuali.`,
          reminder_type: 'annual_review',
          scheduled_for: reviewDate.toISOString(),
          metadata: {
            contract_id: contract.id,
            provider: contract.provider,
            start_date: contract.start_date,
          }
        });
      }
    }

    // Reminder 4: Seasonal energy tips
    const now = new Date();
    
    // Summer reminder (May)
    const summerDate = new Date(now.getFullYear(), 4, 15); // 15 Maggio
    if (summerDate > now) {
      reminders.push({
        user_id,
        title: 'Preparati per l\'Estate',
        message: 'L\'estate si avvicina! Ottimizza l\'uso del climatizzatore e considera tariffe più vantaggiose per i consumi estivi.',
        reminder_type: 'seasonal_tip',
        scheduled_for: summerDate.toISOString(),
        metadata: {
          season: 'summer',
          tips: ['Use programmable thermostats', 'Close blinds during peak hours', 'Service your AC unit']
        }
      });
    }

    // Winter reminder (October)
    const winterDate = new Date(now.getFullYear(), 9, 15); // 15 Ottobre
    if (winterDate > now) {
      reminders.push({
        user_id,
        title: 'Preparati per l\'Inverno',
        message: 'L\'inverno si avvicina! Verifica l\'isolamento termico e considera tariffe ottimizzate per il riscaldamento.',
        reminder_type: 'seasonal_tip',
        scheduled_for: winterDate.toISOString(),
        metadata: {
          season: 'winter',
          tips: ['Check insulation', 'Service heating system', 'Consider winter tariffs']
        }
      });
    }

    // Check for existing reminders to avoid duplicates
    const { data: existingReminders } = await supabaseClient
      .from('scheduled_reminders')
      .select('reminder_type, scheduled_for')
      .eq('user_id', user_id)
      .eq('is_sent', false);

    // Filter out duplicates
    const newReminders = reminders.filter(r => {
      return !existingReminders?.some(e => 
        e.reminder_type === r.reminder_type && 
        new Date(e.scheduled_for).toDateString() === new Date(r.scheduled_for).toDateString()
      );
    });

    // Insert new reminders
    if (newReminders.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('scheduled_reminders')
        .insert(newReminders);

      if (insertError) {
        console.error('Error inserting reminders:', insertError);
        throw insertError;
      }

      console.log(`Successfully created ${newReminders.length} reminders`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminders_created: newReminders.length,
        reminders: newReminders 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in schedule-reminders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
