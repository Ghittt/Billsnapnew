import { Zap, MessageSquare, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center hover:opacity-70 transition-all">
          <span className="text-base sm:text-lg md:text-xl font-sf-pro font-bold text-primary tracking-wide">BillSnap</span>
        </Link>
        
        <nav className="flex items-center gap-1 sm:gap-2 md:gap-4">
          <Link 
            to="/terms-and-conditions#chi-siamo" 
            className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2 py-1 whitespace-nowrap"
          >
            <span className="hidden sm:inline">Chi siamo</span>
            <span className="sm:hidden">Chi</span>
          </Link>
          
          <Link 
            to="/offerta-collettiva" 
            className="text-xs md:text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 sm:gap-1.5 transition-colors px-1.5 sm:px-2 py-1 whitespace-nowrap"
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Offerta Collettiva</span>
            <span className="sm:hidden">Gruppo</span>
          </Link>
          
          <Link 
            to="/feedback" 
            className="text-xs md:text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 sm:gap-1.5 transition-colors px-1.5 sm:px-2 py-1 whitespace-nowrap"
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Feedback</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;