import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, CheckCircle2 } from "lucide-react";

interface Reminder {
  id: string;
  title: string;
  message: string;
  reminder_type: string;
  scheduled_for: string;
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
}

export default function ScheduledReminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchReminders();
    }
  }, [user]);

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_reminders')
        .select('*')
        .eq('user_id', user?.id)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingReminders = reminders.filter(r => !r.is_sent && new Date(r.scheduled_for) > new Date());
  const pastReminders = reminders.filter(r => r.is_sent);

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
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Promemoria Programmati
          {upcomingReminders.length > 0 && (
            <Badge variant="secondary">{upcomingReminders.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {upcomingReminders.length === 0 && pastReminders.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nessun promemoria programmato al momento
            </p>
          </div>
        ) : (
          <>
            {upcomingReminders.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">In arrivo</h4>
                {upcomingReminders.map(reminder => (
                  <Card key={reminder.id} className="border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-semibold">{reminder.title}</h5>
                            <Badge variant="outline" className="capitalize">
                              {reminder.reminder_type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{reminder.message}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                            <Calendar className="w-3 h-3" />
                            {new Date(reminder.scheduled_for).toLocaleDateString('it-IT', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {pastReminders.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Inviati</h4>
                {pastReminders.slice(0, 3).map(reminder => (
                  <Card key={reminder.id} className="opacity-60">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <h5 className="font-semibold text-sm">{reminder.title}</h5>
                          <p className="text-xs text-muted-foreground">{reminder.message}</p>
                          <p className="text-xs text-muted-foreground">
                            Inviato il {new Date(reminder.sent_at!).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
