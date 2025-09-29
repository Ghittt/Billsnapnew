import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { Badge } from "@/components/gamification/Badge";
import { ProgressBar } from "@/components/gamification/ProgressBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BadgeType {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria_json: any;
  created_at: string;
}
import { Crown, Gift, Star, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserBadge {
  badge_id: string;
  earned_at: string;
  badges: BadgeType;
}

interface Profile {
  total_savings_eur: number;
  is_premium: boolean;
  premium_expires_at: string | null;
}

export default function Profile() {
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [referralCode, setReferralCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch badges
      const { data: allBadges } = await supabase
        .from('badges')
        .select('*');

      // Fetch user badges
      const { data: userBadgesData } = await supabase
        .from('user_badges')
        .select(`
          badge_id,
          earned_at,
          badges (*)
        `)
        .eq('user_id', user.id);

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('total_savings_eur, is_premium, premium_expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch or create referral code
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('referral_code')
        .eq('referrer_user_id', user.id)
        .maybeSingle();

      if (existingReferral) {
        setReferralCode(existingReferral.referral_code);
      } else {
        // Generate new referral code
        const code = `BILL${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        await supabase
          .from('referrals')
          .insert({
            referrer_user_id: user.id,
            referral_code: code
          });
        setReferralCode(code);
      }

      setBadges(allBadges || []);
      setUserBadges(userBadgesData || []);
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: "Codice copiato!",
      description: "Condividi il tuo codice con gli amici per guadagnare bonus.",
    });
  };

  const upgradeToPremium = () => {
    toast({
      title: "Premium in arrivo!",
      description: "La funzione Premium sarà disponibile presto.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-48 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const earnedBadgeIds = userBadges.map(ub => ub.badge_id);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Il tuo profilo</h1>
          <p className="text-muted-foreground">
            Monitora i tuoi progressi e sblocca nuovi achievement
          </p>
        </div>

        {/* Progress Bar */}
        <ProgressBar totalSavings={profile?.total_savings_eur || 0} />

        {/* Premium Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">
                  {profile?.is_premium ? "Account Premium" : "Account Gratuito"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {profile?.is_premium 
                    ? `Attivo fino al ${new Date(profile.premium_expires_at!).toLocaleDateString('it-IT')}`
                    : "Passa a Premium per funzionalità avanzate"
                  }
                </p>
              </div>
            </div>
            {!profile?.is_premium && (
              <Button onClick={upgradeToPremium} className="gap-2">
                <Star className="w-4 h-4" />
                Passa a Premium
              </Button>
            )}
          </div>
        </Card>

        {/* Referral System */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Gift className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Invita i tuoi amici</h3>
              <p className="text-sm text-muted-foreground">
                Guadagna €5 per ogni amico che si iscrive con il tuo codice
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-center">
              {referralCode}
            </div>
            <Button onClick={copyReferralCode} variant="outline">
              Copia
            </Button>
          </div>
        </Card>

        {/* Badges */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">I tuoi Achievement</h3>
              <p className="text-sm text-muted-foreground">
                {earnedBadgeIds.length}/{badges.length} badge sbloccate
              </p>
            </div>
          </div>
          
          <div className="grid gap-4">
            {badges.map(badge => {
              const userBadge = userBadges.find(ub => ub.badge_id === badge.id);
              return (
                <Badge
                  key={badge.id}
                  badge={badge}
                  earned={!!userBadge}
                  earnedAt={userBadge?.earned_at}
                />
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}