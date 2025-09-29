import { Zap, MessageSquare, User } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="border-b border-border bg-gradient-subtle">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">BillSnap</span>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to="/profile" 
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            <User className="w-4 h-4" />
            Profilo
          </Link>
          <Link 
            to="/feedback" 
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Feedback
          </Link>
          <div className="text-sm text-muted-foreground">
            Risparmia sulle bollette
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;