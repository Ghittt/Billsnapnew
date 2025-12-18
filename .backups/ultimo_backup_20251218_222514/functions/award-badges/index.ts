import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AwardBadgeRequest {
  user_id: string;
  badge_name?: string;
  upload_id?: string;
  savings_amount?: number;
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

    const { user_id, badge_name, upload_id, savings_amount }: AwardBadgeRequest = await req.json();

    console.log('Checking badges for user:', user_id);

    // Get all badges
    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('*');

    if (badgesError) {
      console.error('Error fetching badges:', badgesError);
      throw badgesError;
    }

    // Get user's current badges
    const { data: userBadges, error: userBadgesError } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', user_id);

    if (userBadgesError) {
      console.error('Error fetching user badges:', userBadgesError);
      throw userBadgesError;
    }

    const earnedBadgeIds = userBadges?.map(ub => ub.badge_id) || [];
    const newBadges = [];

    // Get user data for badge criteria
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_savings_eur, is_premium')
      .eq('user_id', user_id)
      .maybeSingle();

    const { data: uploads } = await supabase
      .from('uploads')
      .select('id')
      .eq('user_id', user_id);

    const { data: referrals } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_user_id', user_id)
      .eq('status', 'completed');

    // Check each badge criteria
    for (const badge of badges || []) {
      if (earnedBadgeIds.includes(badge.id)) continue;

      const criteria = badge.criteria_json;
      let shouldAward = false;

      switch (badge.name) {
        case 'primo_risparmio':
          shouldAward = !!(savings_amount && savings_amount > 0);
          break;
        
        case 'campione_bollette':
          shouldAward = !!(uploads && uploads.length >= 5);
          break;
        
        case 'super_saver':
          shouldAward = !!(profile && profile.total_savings_eur >= 500);
          break;
        
        case 'referral_master':
          shouldAward = !!(referrals && referrals.length >= 3);
          break;
        
        case 'premium_user':
          shouldAward = !!(profile && profile.is_premium);
          break;
      }

      if (shouldAward) {
        // Award the badge
        const { error: awardError } = await supabase
          .from('user_badges')
          .insert({
            user_id,
            badge_id: badge.id
          });

        if (!awardError) {
          newBadges.push(badge);
          
          // Send notification
          await supabase
            .from('notifications')
            .insert({
              user_id,
              type: 'badge_earned',
              title: 'Nuovo badge sbloccato!',
              message: `Complimenti! Hai ottenuto il badge "${badge.description}"`,
              data: {
                badge_id: badge.id,
                badge_name: badge.name,
                badge_icon: badge.icon
              }
            });

          console.log(`Awarded badge ${badge.name} to user ${user_id}`);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      new_badges: newBadges,
      total_badges_earned: earnedBadgeIds.length + newBadges.length
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in award-badges function:', error);
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