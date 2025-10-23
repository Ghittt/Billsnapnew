import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface NotificationBellProps {
  uploadId?: string;
  currentProvider?: string;
  estimatedSaving?: number;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  uploadId,
  currentProvider,
  estimatedSaving
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  const { user, signInWithGoogle, signInWithApple } = useAuth();
  const { toast } = useToast();

  // Show bell after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Check if user is already subscribed
  useEffect(() => {
    const checkSubscription = async () => {
      if (user && uploadId) {
        const { data } = await supabase
          .from('notification_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('upload_id', uploadId)
          .single();
        
        if (data) {
          setIsSubscribed(true);
        }
      }
    };
    checkSubscription();
  }, [user, uploadId]);

  const handleBellClick = () => {
    if (isSubscribed) {
      toast({
        title: "Già iscritto",
        description: "Ti avviseremo quando ci sono nuove offerte migliori 😉",
      });
      return;
    }
    setIsDialogOpen(true);
  };

  const saveSubscription = async (userId: string, userEmail: string, userName?: string) => {
    try {
      const { error } = await supabase
        .from('notification_subscriptions')
        .insert({
          user_id: userId,
          email: userEmail,
          display_name: userName || null,
          upload_id: uploadId || null,
          current_provider: currentProvider || null,
          estimated_saving_eur: estimatedSaving || null,
        });

      if (error) throw error;

      setIsSubscribed(true);
      setIsDialogOpen(false);
      toast({
        title: "Perfetto! 🎉",
        description: "Ti avvisiamo solo se c'è da risparmiare di nuovo 😉",
      });
    } catch (error) {
      console.error('Error saving subscription:', error);
      toast({
        title: "Errore",
        description: "Non siamo riusciti a salvare la tua iscrizione. Riprova.",
        variant: "destructive"
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      
      // Wait for auth state to update
      setTimeout(async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.email) {
          await saveSubscription(
            authUser.id,
            authUser.email,
            authUser.user_metadata?.full_name || authUser.user_metadata?.name
          );
        }
      }, 1000);
    } catch (error) {
      console.error('Google sign in error:', error);
      toast({
        title: "Errore",
        description: "Non siamo riusciti ad accedere con Google. Riprova.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithApple();
      if (error) throw error;
      
      // Wait for auth state to update
      setTimeout(async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.email) {
          await saveSubscription(
            authUser.id,
            authUser.email,
            authUser.user_metadata?.full_name || authUser.user_metadata?.name
          );
        }
      }, 1000);
    } catch (error) {
      console.error('Apple sign in error:', error);
      toast({
        title: "Errore",
        description: "Non siamo riusciti ad accedere con Apple. Riprova.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      // Check if user exists or create anonymous subscription
      if (user) {
        await saveSubscription(user.id, email, displayName);
      } else {
        // For non-authenticated users, create a temporary account or just save email
        const { error } = await supabase
          .from('notification_subscriptions')
          .insert({
            email,
            display_name: displayName || null,
            upload_id: uploadId || null,
            current_provider: currentProvider || null,
            estimated_saving_eur: estimatedSaving || null,
          });

        if (error) throw error;

        setIsSubscribed(true);
        setIsDialogOpen(false);
        toast({
          title: "Perfetto! 🎉",
          description: "Ti avvisiamo solo se c'è da risparmiare di nuovo 😉",
        });
      }
    } catch (error) {
      console.error('Error saving email subscription:', error);
      toast({
        title: "Errore",
        description: "Non siamo riusciti a salvare la tua email. Riprova.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <div 
        className="glass rounded-xl p-6 text-center cursor-pointer hover:scale-105 transition-transform"
        onClick={handleBellClick}
        style={{ marginTop: '24px', animation: isSubscribed ? 'none' : 'bellGlow 2s ease-in-out infinite' }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Avvisami quando c'è da risparmiare</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Niente pubblicità. Solo il suono dolce di una bolletta più bassa.
        </p>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              🔔 Resta aggiornato sui risparmi
            </DialogTitle>
            <DialogDescription className="text-center">
              Io tengo d'occhio le tariffe per te. Quando trovo una bolletta più dolce, ti scrivo subito 💡
            </DialogDescription>
          </DialogHeader>

          {!isEmailMode ? (
            <div className="space-y-3 pt-4">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full h-12 text-base"
                variant="outline"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Accedi con Google
              </Button>

              <Button
                onClick={handleAppleSignIn}
                disabled={isLoading}
                className="w-full h-12 text-base"
                variant="outline"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Accedi con Apple
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">oppure</span>
                </div>
              </div>

              <Button
                onClick={() => setIsEmailMode(true)}
                variant="ghost"
                className="w-full"
              >
                Inserisci email manualmente
              </Button>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome (opzionale)</Label>
                <Input
                  id="name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Il tuo nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@esempio.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Salvataggio...' : 'Avvisami'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsEmailMode(false)}
                >
                  Torna indietro
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Ti avvisiamo solo in caso di nuove offerte migliori. I tuoi dati sono protetti secondo GDPR.
              </p>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes bellGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(var(--primary-rgb), 0.3); }
          50% { box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.6); }
        }
      `}</style>
    </>
  );
};