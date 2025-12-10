import { Link } from "react-router-dom";
import { DailyComparisonCounter } from "@/components/DailyComparisonCounter";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <span className="text-[24px] font-semibold tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, sans-serif', color: '#A855F7' }}>
            BillSnap
          </span>
        </Link>
        
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <DailyComparisonCounter />
        </div>
        
        <nav className="flex items-center gap-6">
          <Link 
            to="/chi-siamo" 
            className="text-[15px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Chi siamo
          </Link>
          
          <Link 
            to="/offerta-collettiva" 
            className="text-[15px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Gruppo
          </Link>
          
          <Link 
            to="/feedback" 
            className="text-[15px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Feedback
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
