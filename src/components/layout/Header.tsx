import { Zap, MessageSquare, User, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50 backdrop-blur-xl">
      <div className="container mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-spring group">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-medium group-hover:shadow-strong transition-spring">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-foreground tracking-tight">BillSnap</span>
        </Link>
        
        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link 
                to="/profile" 
                className="text-sm font-medium text-muted-foreground hover:text-primary flex items-center gap-2 transition-spring"
              >
                <User className="w-5 h-5" />
                <span className="hidden sm:inline">Profilo</span>
              </Link>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSignOut}
                className="text-sm font-medium flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Esci</span>
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/auth')}
              className="font-semibold"
            >
              Accedi
            </Button>
          )}
          
          <Link 
            to="/feedback" 
            className="text-sm font-medium text-muted-foreground hover:text-primary flex items-center gap-2 transition-spring"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="hidden sm:inline">Feedback</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;