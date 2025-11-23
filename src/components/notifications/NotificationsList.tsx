import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, TrendingDown, Info, AlertCircle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  data: any;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
}

export default function NotificationsList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('sent_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          console.log('New notification:', payload);
          setNotifications(prev => [payload.new as Notification, ...prev]);
          
          // Show toast for new notification
          toast({
            title: (payload.new as Notification).title,
            description: (payload.new as Notification).message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, opened_at: new Date().toISOString() } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.opened_at).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ opened_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, opened_at: n.opened_at || new Date().toISOString() }))
      );

      toast({
        title: "Notifiche lette",
        description: `${unreadIds.length} notifiche segnate come lette`,
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: "Errore",
        description: "Impossibile segnare le notifiche come lette",
        variant: "destructive"
      });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'better_offer':
        return <TrendingDown className="w-5 h-5 text-primary" />;
      case 'recommendation':
        return <Sparkles className="w-5 h-5 text-primary" />;
      case 'reminder':
        return <AlertCircle className="w-5 h-5 text-warning" />;
      default:
        return <Info className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.opened_at).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notifiche
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              Segna tutte come lette
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nessuna notifica al momento
            </p>
          </div>
        ) : (
          notifications.map(notification => (
            <Card
              key={notification.id}
              className={`cursor-pointer transition-colors ${
                !notification.opened_at 
                  ? 'border-primary/30 bg-primary/5' 
                  : 'opacity-70'
              }`}
              onClick={() => !notification.opened_at && markAsRead(notification.id)}
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm">
                        {notification.title}
                      </h4>
                      {!notification.opened_at && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(notification.sent_at).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}
