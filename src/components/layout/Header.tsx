import { Link } from "react-router-dom";
import { DailyComparisonCounter } from "@/components/DailyComparisonCounter";
import { Menu } from "lucide-react";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="hover:opacity-80 transition-opacity flex-shrink-0">
          <span className="text-[24px] font-semibold tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, sans-serif', color: '#A855F7' }}>
            BillSnap
          </span>
        </Link>
        
        {/* Counter - nascosto su mobile, visibile su tablet+ */}
        <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2">
          <DailyComparisonCounter />
        </div>
        
        {/* Nav scrollabile su mobile */}
        <nav className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar mask-gradient-right">
          <Link 
            to="/chi-siamo" 
            className="text-[14px] sm:text-[15px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            Chi siamo
          </Link>
          
          <Link 
            to="/offerta-collettiva" 
            className="text-[14px] sm:text-[15px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            Gruppo
          </Link>
          
          <Link 
            to="/feedback" 
            className="text-[14px] sm:text-[15px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            Feedback
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
