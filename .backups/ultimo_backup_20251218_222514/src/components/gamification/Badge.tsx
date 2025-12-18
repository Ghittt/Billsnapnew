interface BadgeType {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria_json: any;
  created_at: string;
}

interface BadgeProps {
  badge: BadgeType;
  earned?: boolean;
  earnedAt?: string;
}

export const Badge = ({ badge, earned = false, earnedAt }: BadgeProps) => {
  return (
    <div
      className={`
        flex items-center gap-3 p-4 rounded-lg border transition-all
        ${earned 
          ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 shadow-sm' 
          : 'bg-muted/30 border-border/50 opacity-60'
        }
      `}
    >
      <div className={`text-2xl ${earned ? 'grayscale-0' : 'grayscale'}`}>
        {badge.icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className={`font-medium ${earned ? 'text-foreground' : 'text-muted-foreground'}`}>
            {badge.description}
          </h3>
          {earned && (
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          )}
        </div>
        {earned && earnedAt && (
          <p className="text-sm text-muted-foreground mt-1">
            Ottenuto il {new Date(earnedAt).toLocaleDateString('it-IT')}
          </p>
        )}
      </div>
    </div>
  );
};