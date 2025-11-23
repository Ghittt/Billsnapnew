import { Zap, MessageSquare, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-70 transition-all">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold">BillSnap</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <Link 
            to="/offerta-collettiva" 
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Offerta Collettiva</span>
          </Link>
          
          <Link 
            to="/feedback" 
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Feedback</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;