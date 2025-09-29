import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BetterOfferCheck {
  user_id: string;
  current_offer_id: string;
  current_annual_cost: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting better offers check...');

    // Get all active users with their current offers
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select(`
        upload_id,
        offer_id,
        annual_cost_offer,
        created_at,
        uploads!inner(user_id),
        offers!inner(provider, plan_name, unit_price_eur_kwh, fixed_fee_eur_mo)
      `)
      .order('created_at', { ascending: false });

    if (quotesError) {
      console.error('Error fetching quotes:', quotesError);
      throw quotesError;
    }

    console.log(`Found ${quotes?.length || 0} quotes to check`);

    // Get all available offers
    const { data: allOffers, error: offersError } = await supabase
      .from('offers')
      .select('*');

    if (offersError) {
      console.error('Error fetching offers:', offersError);
      throw offersError;
    }

    console.log(`Found ${allOffers?.length || 0} available offers`);

    let notificationsSent = 0;

    // Group quotes by user_id to get the latest for each user
    const userQuotes = new Map();
    quotes?.forEach((quote: any) => {
      const userId = quote.uploads?.user_id;
      if (userId && (!userQuotes.has(userId) || 
          quote.created_at > userQuotes.get(userId).created_at)) {
        userQuotes.set(userId, quote);
      }
    });

    console.log(`Processing ${userQuotes.size} unique users`);

    // Check each user's current offer against all available offers
    for (const [userId, userQuote] of userQuotes) {
      const currentCost = userQuote.annual_cost_offer;
      
      // Find better offers (at least 10% savings)
      const betterOffers = allOffers?.filter(offer => {
        // Calculate estimated annual cost for this offer
        // Note: This is a simplified calculation - in practice you'd need consumption data
        const estimatedAnnualCost = (offer.unit_price_eur_kwh * 2000) + (offer.fixed_fee_eur_mo * 12);
        const potentialSavings = currentCost - estimatedAnnualCost;
        const savingsPercentage = (potentialSavings / currentCost) * 100;
        
        return savingsPercentage >= 10; // At least 10% savings
      });

      if (betterOffers && betterOffers.length > 0) {
        const bestOffer = betterOffers[0];
        const estimatedAnnualCost = (bestOffer.unit_price_eur_kwh * 2000) + (bestOffer.fixed_fee_eur_mo * 12);
        const potentialSavings = currentCost - estimatedAnnualCost;

        // Check if we haven't sent a notification for this offer recently
        const { data: recentNotifications } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'better_offer')
          .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

        if (!recentNotifications || recentNotifications.length === 0) {
          // Send notification
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              type: 'better_offer',
              title: 'Nuova occasione di risparmio!',
              message: `Abbiamo trovato un'offerta migliore che ti fa risparmiare €${potentialSavings.toFixed(0)}/anno. Vuoi attivarla?`,
              data: {
                offer_id: bestOffer.id,
                provider: bestOffer.provider,
                plan_name: bestOffer.plan_name,
                estimated_savings: potentialSavings,
                current_cost: currentCost,
                new_cost: estimatedAnnualCost
              }
            });

          if (notificationError) {
            console.error('Error sending notification:', notificationError);
          } else {
            notificationsSent++;
            console.log(`Notification sent to user ${userId} for savings of €${potentialSavings.toFixed(0)}`);
          }
        }
      }
    }

    console.log(`Better offers check completed. Sent ${notificationsSent} notifications.`);

    return new Response(JSON.stringify({
      success: true,
      users_checked: userQuotes.size,
      notifications_sent: notificationsSent,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in check-better-offers function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);